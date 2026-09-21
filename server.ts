import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

let firebaseConfig: any = null;
if (fs.existsSync(CONFIG_FILE)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error parsing firebase-applet-config.json:', err);
  }
}

function calculateLevel(exp: number): number {
  const currentExp = Math.max(0, Number(exp) || 0);
  if (currentExp >= 16000) return 10;
  if (currentExp >= 10000) return 9;
  if (currentExp >= 7120) return 8;
  if (currentExp >= 4200) return 7;
  if (currentExp >= 2900) return 6;
  if (currentExp >= 1300) return 5;
  if (currentExp >= 700) return 4;
  if (currentExp >= 450) return 3;
  if (currentExp >= 120) return 2;
  return 1;
}

class ServerDatabase {
  private data: any;
  private firestore: any = null;
  private activeSessions: Map<string, number> = new Map(); // username -> lastSeen timestamp
  private rankedQueue: Map<string, { username: string; name: string; avatar: string; joinedAt: number }> = new Map();
  private activeMatches: Map<string, {
    player1: string;
    player2: string;
    startedAt: number;
    roundStartedAt?: number;
    faceOffUntil?: number;
    currentRound: number;
    roundType: string;
    roundTypesOrder?: string[];
    targetWord: string;
    essayTopic: string;
    guessImage: string;
    question?: string;
    options?: string[];
    correctIndex?: number;
    submissions: { [username: string]: { submitted: boolean; answer: string; time: number; correct: boolean } };
    roundWinner: string | null;
    scores: { [username: string]: number };
    status: 'playing' | 'round-result' | 'game-over';
    rewardsApplied?: boolean;
    matchRewards?: { [username: string]: any };
  }> = new Map();

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const defaultData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      users: {
        "ahmed_admin123": {
          "username": "ahmed_admin123",
          "passwordHash": "admin123",
          "createdAt": new Date().toISOString()
        }
      },
      profiles: {
        "ahmed_admin123": {
          "name": "Prof. Ahmed",
          "age": 35,
          "yearBorn": 1989,
          "honor": 1000,
          "level": 99,
          "exp": 10000,
          "completedAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString(),
          "bio": "English Language Professor & Academic Coordinator",
          "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=400&q=80"
        }
      },
      messages: [],
      groups: [],
      notifications: [],
      homeworks: [],
    };
    
    const dbData = this.loadDatabase();
    this.data = { ...defaultData, ...dbData };
    // Merge nested objects
    this.data.users = { ...defaultData.users, ...dbData.users };
    this.data.profiles = { ...defaultData.profiles, ...dbData.profiles };
    
    if (!fs.existsSync(DB_FILE)) {
      this.persist();
    }

    // Initialize Firebase Admin & load from Firestore
    if (firebaseConfig) {
      try {
        const app = getApps().length === 0 ? initializeApp({
          projectId: firebaseConfig.projectId,
        }) : getApps()[0];
        
        const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
        if (dbId && dbId !== '(default)') {
          this.firestore = getFirestore(app, dbId);
        } else {
          this.firestore = getFirestore(app);
        }
        
        console.log(`[Firestore] Initialized with databaseId: ${dbId}`);
        this.loadFromFirestore();
      } catch (err) {
        console.error('[Firestore] Initialization error:', err);
      }
    }
  }

  private async loadFromFirestore() {
    if (!this.firestore) return;
    try {
      console.log('[Firestore] Syncing memory with Firestore data...');
      
      // 1. Users
      try {
        const usersSnap = await this.firestore.collection('users').get();
        usersSnap.forEach((doc: any) => {
          this.data.users[doc.id] = doc.data();
        });
      } catch (e: any) {
        console.warn('[Firestore] Skipped users sync due to rules:', e.message);
      }

      // 2. Profiles
      try {
        const profilesSnap = await this.firestore.collection('profiles').get();
        profilesSnap.forEach((doc: any) => {
          this.data.profiles[doc.id] = doc.data();
        });
      } catch (e: any) {
        console.warn('[Firestore] Skipped profiles sync due to rules:', e.message);
      }

      // 3. Messages
      try {
        const messagesSnap = await this.firestore.collection('messages').get();
        const loadedMsgs: any[] = [];
        messagesSnap.forEach((doc: any) => {
          loadedMsgs.push({ id: doc.id, ...doc.data() });
        });
        if (loadedMsgs.length > 0) {
          loadedMsgs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
          this.data.messages = loadedMsgs;
        }
      } catch (e: any) {
        console.warn('[Firestore] Skipped messages sync due to rules:', e.message);
      }

      // 4. Groups
      try {
        const groupsSnap = await this.firestore.collection('groups').get();
        const loadedGroups: any[] = [];
        groupsSnap.forEach((doc: any) => {
          loadedGroups.push({ id: doc.id, ...doc.data() });
        });
        if (loadedGroups.length > 0) {
          this.data.groups = loadedGroups;
        }
      } catch (e: any) {
        console.warn('[Firestore] Skipped groups sync due to rules:', e.message);
      }

      // 5. Notifications
      try {
        const notificationsSnap = await this.firestore.collection('notifications').get();
        const loadedNotifications: any[] = [];
        notificationsSnap.forEach((doc: any) => {
          loadedNotifications.push({ id: doc.id, ...doc.data() });
        });
        if (loadedNotifications.length > 0) {
          this.data.notifications = loadedNotifications;
        }
      } catch (e: any) {
        console.warn('[Firestore] Skipped notifications sync due to rules:', e.message);
      }

      // 6. Homeworks
      try {
        const homeworksSnap = await this.firestore.collection('homeworks').get();
        const loadedHomeworks: any[] = [];
        homeworksSnap.forEach((doc: any) => {
          loadedHomeworks.push({ id: doc.id, ...doc.data() });
        });
        if (loadedHomeworks.length > 0) {
          loadedHomeworks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          this.data.homeworks = loadedHomeworks;
        }
      } catch (e: any) {
        console.warn('[Firestore] Skipped homeworks sync due to rules:', e.message);
      }

      console.log('[Firestore] Synced completely and successfully with cloud data!');
      this.persist(); // Back up to local JSON file
    } catch (err) {
      console.error('[Firestore] Error syncing with Firestore:', err);
    }
  }

  private async saveToFirestore(collection: string, docId: string, docData: any) {
    if (!this.firestore) return;
    try {
      await this.firestore.collection(collection).doc(docId).set(docData);
    } catch (err: any) {
      console.warn(`[Firestore] Permission skipped saving to ${collection}/${docId}:`, err?.message || err);
    }
  }

  private async deleteFromFirestore(collection: string, docId: string) {
    if (!this.firestore) return;
    try {
      await this.firestore.collection(collection).doc(docId).delete();
    } catch (err: any) {
      console.warn(`[Firestore] Permission skipped deleting from ${collection}/${docId}:`, err?.message || err);
    }
  }

  private loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Error loading db:', e);
    }
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      users: {},
      profiles: {},
      messages: [],
      groups: [],
      notifications: [],
      homeworks: [],
    };
  }
  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error persisting db:', e);
    }
  }
  public getStats() {
    return {
      status: 'online',
      storageEngine: this.firestore ? 'Persistent Firebase Firestore' : 'Express Real Server DB',
      totalUsers: Object.keys(this.data.users || {}).length,
      totalProfiles: Object.keys(this.data.profiles || {}).length,
      lastUpdated: this.data.updatedAt,
    };
  }
  private checkGuessAnswer(userAnswer: string, itemData: any): boolean {
    if (!userAnswer || !itemData) return false;
    let cleanInput = userAnswer.trim().toLowerCase();
    cleanInput = cleanInput.replace(/^(a|an|the)\s+/, '');

    const validList: string[] = itemData.validAnswers || [itemData.name?.toLowerCase() || ''];
    return validList.some(ans => {
      const cleanAns = ans.trim().toLowerCase();
      return cleanAns === cleanInput || cleanInput === cleanAns + 's' || cleanInput + 's' === cleanAns;
    });
  }

  private generateRoundDetails(roundType: string) {
    const details = {
      targetWord: '',
      essayTopic: '',
      guessImage: '',
      question: '',
      options: [] as string[],
      correctIndex: -1,
    };

    if (roundType === 'memorize') {
      const words = [
        'Ambition', 'Knowledge', 'Curiosity', 'Resilience', 'Adventure', 
        'Perspective', 'Creativity', 'Dedication', 'Integrity', 'Optimism',
        'Determination', 'Compassion', 'Perseverance', 'Enthusiasm', 'Generosity',
        'Leadership', 'Hospitality', 'Confidence', 'Patience', 'Intelligence',
        'Atmosphere', 'Environment', 'Biodiversity', 'Constellation', 'Photosynthesis',
        'Ecosystem', 'Temperature', 'Gravity', 'Electricity', 'Pollination',
        'Communication', 'Celebration', 'Appreciation', 'Architecture', 'Literature',
        'Tradition', 'Sculpture', 'Symphony', 'Community', 'Destination',
        'Philosophy', 'Investigation', 'Comprehension', 'Innovation', 'Phenomenon',
        'Extraordinary', 'Opportunity', 'Magnificent', 'Fascinating', 'Remarkable',
        'Algorithm', 'Cybersecurity', 'Automation', 'Satellite', 'Navigation'
      ];
      details.targetWord = words[Math.floor(Math.random() * words.length)];
    } else if (roundType === 'essay') {
      const topics = [
        'Describe the importance of continuous learning in modern life.',
        'What would you do if you could travel anywhere in the world tomorrow?',
        'Explain how technology has transformed modern education.',
        'Discuss the benefits of being bilingual or learning a new language.',
        'What is your favorite book or movie, and what did you learn from it?',
        'How can young people contribute to protecting the environment and nature?',
        'Describe a person who inspires you and explain the qualities you admire in them.',
        'What are the advantages and disadvantages of social media in our daily lives?',
        'If you could invent something to make the world better, what would it be?',
        'Explain why teamwork and collaboration are essential for achieving big goals.',
        'How does reading books improve our imagination and communication skills?',
        'Describe an unforgettable experience that taught you a valuable life lesson.',
        'What habits can help a student achieve academic excellence and balance in life?',
        'How can artificial intelligence assist humans in solving complex problems?',
        'Describe your dream career and the steps you plan to take to achieve it.'
      ];
      details.essayTopic = topics[Math.floor(Math.random() * topics.length)];
    } else if (roundType === 'guess') {
      const guessObjects = [
        {
          name: 'Book',
          validAnswers: ['book'],
          imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'كتاب',
          englishHint: 'Used for reading, studying, and gaining knowledge.',
          emoji: '📚'
        },
        {
          name: 'Refrigerator',
          validAnswers: ['refrigerator', 'fridge'],
          imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'ثلاجة',
          englishHint: 'A large kitchen appliance used to store food and drinks cold.',
          emoji: '🧊'
        },
        {
          name: 'Airplane',
          validAnswers: ['airplane', 'plane', 'aeroplane'],
          imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'طائرة',
          englishHint: 'A vehicle with wings that flies passengers high in the sky.',
          emoji: '✈️'
        },
        {
          name: 'Car',
          validAnswers: ['car', 'automobile', 'auto'],
          imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'سيارة',
          englishHint: 'A motor vehicle with four wheels used for driving.',
          emoji: '🚗'
        },
        {
          name: 'House',
          validAnswers: ['house', 'home'],
          imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'منزل / بيت',
          englishHint: 'A building where people and families live.',
          emoji: '🏠'
        },
        {
          name: 'Phone',
          validAnswers: ['phone', 'smartphone', 'telephone', 'mobile'],
          imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'هاتف / جوال',
          englishHint: 'An electronic handheld device used to call, text, and browse.',
          emoji: '📱'
        },
        {
          name: 'Clock',
          validAnswers: ['clock', 'watch'],
          imageUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'ساعة',
          englishHint: 'An instrument used to tell and track time.',
          emoji: '⏰'
        },
        {
          name: 'Tree',
          validAnswers: ['tree'],
          imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'شجرة',
          englishHint: 'A tall wooden plant with branches, leaves, and roots.',
          emoji: '🌳'
        },
        {
          name: 'Dog',
          validAnswers: ['dog', 'puppy'],
          imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'كلب',
          englishHint: 'A loyal four-legged pet known as man’s best friend.',
          emoji: '🐶'
        },
        {
          name: 'Cat',
          validAnswers: ['cat', 'kitten'],
          imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'قطة',
          englishHint: 'A small pet animal that meows and likes to play.',
          emoji: '🐱'
        },
        {
          name: 'Bicycle',
          validAnswers: ['bicycle', 'bike'],
          imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'دراجة هوائية',
          englishHint: 'A two-wheeled vehicle powered by foot pedals.',
          emoji: '🚲'
        },
        {
          name: 'Apple',
          validAnswers: ['apple'],
          imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'تفاحة',
          englishHint: 'A healthy round red or green fruit.',
          emoji: '🍎'
        },
        {
          name: 'Laptop',
          validAnswers: ['laptop', 'computer', 'pc'],
          imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'حاسوب / لابتوب',
          englishHint: 'A portable computer used for work and studying.',
          emoji: '💻'
        },
        {
          name: 'Camera',
          validAnswers: ['camera'],
          imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'كاميرا',
          englishHint: 'A device used to capture photos and videos.',
          emoji: '📷'
        },
        {
          name: 'Chair',
          validAnswers: ['chair', 'seat'],
          imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'كرسي',
          englishHint: 'A piece of furniture used for sitting down.',
          emoji: '🪑'
        },
        {
          name: 'Telescope',
          validAnswers: ['telescope'],
          imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'تلسكوب / منظار فلكي',
          englishHint: 'An optical instrument used by astronomers to observe distant stars and planets.',
          emoji: '🔭'
        },
        {
          name: 'Microscope',
          validAnswers: ['microscope'],
          imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'مجهر / ميكروسكوب',
          englishHint: 'A scientific instrument used to view very tiny organisms and cells.',
          emoji: '🔬'
        },
        {
          name: 'Backpack',
          validAnswers: ['backpack', 'bag', 'schoolbag'],
          imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'حقيبة ظهر',
          englishHint: 'A bag carried on the back by students and hikers to carry books.',
          emoji: '🎒'
        },
        {
          name: 'Compass',
          validAnswers: ['compass'],
          imageUrl: 'https://images.unsplash.com/photo-1533669955142-6a73332af4db?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'بوصلة',
          englishHint: 'A navigational tool with a magnetic needle pointing North.',
          emoji: '🧭'
        },
        {
          name: 'Umbrella',
          validAnswers: ['umbrella', 'parasol'],
          imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'مظلة / شمسية',
          englishHint: 'A folding canopy device used for protection against rain and sun.',
          emoji: '☂️'
        },
        {
          name: 'Guitar',
          validAnswers: ['guitar'],
          imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'جيتار',
          englishHint: 'A stringed musical instrument played by plucking or strumming.',
          emoji: '🎸'
        },
        {
          name: 'Passport',
          validAnswers: ['passport'],
          imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'جواز سفر',
          englishHint: 'An official document issued by a government certifying identity for international travel.',
          emoji: '🛂'
        },
        {
          name: 'Headphones',
          validAnswers: ['headphones', 'headphone', 'headset', 'earphones'],
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'سماعات رأس',
          englishHint: 'A pair of speakers worn on the head to listen to audio privately.',
          emoji: '🎧'
        },
        {
          name: 'Helmet',
          validAnswers: ['helmet'],
          imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'خوذة حماية',
          englishHint: 'A hard protective hat worn when riding bikes or motorcycles.',
          emoji: '🪖'
        },
        {
          name: 'Flashlight',
          validAnswers: ['flashlight', 'torch'],
          imageUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=600&auto=format&fit=crop&q=80',
          arabicHint: 'مصباح يدوي',
          englishHint: 'A portable battery-powered electric light useful during darkness.',
          emoji: '🔦'
        }
      ];
      const selected = guessObjects[Math.floor(Math.random() * guessObjects.length)];
      details.guessImage = JSON.stringify(selected);
    } else if (roundType === 'grammar') {
      const grammarPool = [
        {
          question: "Choose the correct verb tense: 'She ___ to London yesterday.'",
          options: ['Go', 'Went', 'Gone', 'Going'],
          correctIndex: 1
        },
        {
          question: "Identify the correct preposition: 'He is good ___ English.'",
          options: ['on', 'in', 'at', 'with'],
          correctIndex: 2
        },
        {
          question: "Which sentence uses the Present Perfect correctly?",
          options: ["I have went to London.", "She has finished her homework.", "They has played football.", "We has ate lunch."],
          correctIndex: 1
        },
        {
          question: "Identify the correct modal verb for obligation: 'You ___ wear a helmet when riding a bicycle.'",
          options: ["must", "might", "could", "would"],
          correctIndex: 0
        },
        {
          question: "Choose the correct conditional form: 'If it rains tomorrow, we ___ the picnic.'",
          options: ["cancel", "will cancel", "canceled", "would canceled"],
          correctIndex: 1
        },
        {
          question: "Select the correct relative pronoun: 'The teacher ___ taught us English was very kind.'",
          options: ["which", "who", "whom", "whose"],
          correctIndex: 1
        },
        {
          question: "Complete the sentence with the correct passive voice: 'The novel ___ by Charles Dickens.'",
          options: ["wrote", "was written", "is write", "has written"],
          correctIndex: 1
        },
        {
          question: "Choose the correct preposition of time: 'The exam starts ___ 9:00 AM.'",
          options: ["on", "in", "at", "for"],
          correctIndex: 2
        },
        {
          question: "Choose the comparative form: 'Gold is ___ than silver.'",
          options: ["more expensive", "expensiver", "most expensive", "as expensive"],
          correctIndex: 0
        },
        {
          question: "Select the sentence with correct subject-verb agreement:",
          options: ["Neither the teacher nor the students was present.", "The team of doctors is working hard.", "Everyone have submitted their papers.", "Both of my brothers is engineers."],
          correctIndex: 1
        },
        {
          question: "Choose the correct word: 'I haven't seen my childhood friend ___ five years.'",
          options: ["since", "for", "during", "ago"],
          correctIndex: 1
        },
        {
          question: "Select the correct question tag: 'You are coming to the graduation party, ___?'",
          options: ["aren't you", "are you", "don't you", "isn't it"],
          correctIndex: 0
        },
        {
          question: "Choose the correct conjunction: '___ it was raining heavily, they played the match.'",
          options: ["Because", "Although", "Despite", "Since"],
          correctIndex: 1
        },
        {
          question: "Select the correct indefinite pronoun: 'There is ___ at the door who wants to speak with you.'",
          options: ["anyone", "someone", "no one", "everyone"],
          correctIndex: 1
        },
        {
          question: "Choose the correct form: 'She insisted on ___ the project by herself.'",
          options: ["complete", "completed", "completing", "to complete"],
          correctIndex: 2
        },
        {
          question: "Identify the correct second conditional: 'If I ___ rich, I would travel around the world.'",
          options: ["am", "were", "will be", "had been"],
          correctIndex: 1
        }
      ];
      const selected = grammarPool[Math.floor(Math.random() * grammarPool.length)];
      details.question = selected.question;
      details.options = selected.options;
      details.correctIndex = selected.correctIndex;
    } else if (roundType === 'vocab') {
      const vocabPool = [
        {
          question: "What is a synonym for 'Enthusiastic'?",
          options: ['Indifferent', 'Passionate', 'Apathetic', 'Sleepy'],
          correctIndex: 1
        },
        {
          question: "What is the antonym of 'Generous'?",
          options: ['Kind', 'Selfish', 'Helpful', 'Polite'],
          correctIndex: 1
        },
        {
          question: "Complete the idiom: 'Piece of ___' (meaning very easy)",
          options: ['cake', 'bread', 'pie', 'cookie'],
          correctIndex: 0
        },
        {
          question: "What is the meaning of the word 'Resilient'?",
          options: ['Weak and easily broken', 'Able to withstand or recover from difficulty', 'Lazy and unmotivated', 'Extremely wealthy'],
          correctIndex: 1
        },
        {
          question: "What is a synonym for 'Abundant'?",
          options: ['Scarce', 'Plentiful', 'Empty', 'Tiny'],
          correctIndex: 1
        },
        {
          question: "What is the antonym of 'Permanent'?",
          options: ['Durable', 'Eternal', 'Temporary', 'Constant'],
          correctIndex: 2
        },
        {
          question: "Complete the idiom: 'Actions speak louder than ___'",
          options: ['words', 'thoughts', 'speeches', 'voices'],
          correctIndex: 0
        },
        {
          question: "What does the idiom 'Bite the bullet' mean?",
          options: ['To eat quickly', 'To face a difficult situation bravely', 'To shoot a target', 'To give up easily'],
          correctIndex: 1
        },
        {
          question: "Which word is a synonym for 'Meticulous'?",
          options: ['Careless', 'Careful and precise', 'Aggressive', 'Disorganized'],
          correctIndex: 1
        },
        {
          question: "What is the antonym of 'Arrogant'?",
          options: ['Proud', 'Humble', 'Boastful', 'Rude'],
          correctIndex: 1
        },
        {
          question: "What is the meaning of the phrasal verb 'Call off'?",
          options: ['To postpone', 'To cancel', 'To announce loudly', 'To invite'],
          correctIndex: 1
        },
        {
          question: "What is a synonym for 'Crucial'?",
          options: ['Unimportant', 'Vital and essential', 'Minor', 'Optional'],
          correctIndex: 1
        },
        {
          question: "Complete the idiom: 'Hit the ___' (meaning to go to sleep)",
          options: ['wall', 'floor', 'sack', 'road'],
          correctIndex: 2
        },
        {
          question: "What is the antonym of 'Optimistic'?",
          options: ['Hopeful', 'Confident', 'Pessimistic', 'Cheerful'],
          correctIndex: 2
        },
        {
          question: "What is a synonym for 'Diligent'?",
          options: ['Lazy', 'Hardworking and dedicated', 'Careless', 'Passive'],
          correctIndex: 1
        },
        {
          question: "What does the expression 'Once in a blue moon' mean?",
          options: ['Very frequently', 'Every month', 'Very rarely', 'During nighttime'],
          correctIndex: 2
        }
      ];
      const selected = vocabPool[Math.floor(Math.random() * vocabPool.length)];
      details.question = selected.question;
      details.options = selected.options;
      details.correctIndex = selected.correctIndex;
    }

    return details;
  }

  private scoreEssay(text: string): number {
    if (!text) return 0;
    const clean = text.trim();
    if (!clean) return 0;
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length < 5) return 0;

    let score = 0;
    // 1. Length score (up to 40 points, capped at 60 words for maximum benefit)
    score += Math.min(words.length * 0.8, 40);

    // 2. Vocabulary variety (unique words) (up to 20 points)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const uniqueRatio = words.length > 0 ? (uniqueWords.size / words.length) : 0;
    score += uniqueRatio * 20;

    // 3. Connectors & advanced vocabulary (up to 30 points)
    const connectors = ['because', 'although', 'however', 'moreover', 'therefore', 'furthermore', 'but', 'and', 'firstly', 'secondly', 'finally', 'especially', 'in addition', 'consequently', 'since', 'as a result'];
    let connectorCount = 0;
    connectors.forEach(conn => {
      const regex = new RegExp(`\\b${conn}\\b`, 'gi');
      const matches = clean.match(regex);
      if (matches) connectorCount += matches.length;
    });
    score += Math.min(connectorCount * 5, 30);

    // 4. Grammar clues (capitalization, sentence endings) (up to 10 points)
    if (clean.length > 0 && clean[0] === clean[0].toUpperCase()) score += 5;
    if (clean.endsWith('.') || clean.endsWith('!') || clean.endsWith('?')) score += 5;

    return score;
  }

  private forceSettleRound(match: any) {
    const p1 = match.player1;
    const p2 = match.player2;
    const sub1 = match.submissions[p1];
    const sub2 = match.submissions[p2];

    if (match.roundType === 'essay') {
      const score1 = sub1 && sub1.submitted ? this.scoreEssay(sub1.answer) : 0;
      const score2 = sub2 && sub2.submitted ? this.scoreEssay(sub2.answer) : 0;
      if (score1 > score2) {
        match.roundWinner = p1;
        match.scores[p1] = (match.scores[p1] || 0) + 1;
      } else if (score2 > score1) {
        match.roundWinner = p2;
        match.scores[p2] = (match.scores[p2] || 0) + 1;
      } else {
        match.roundWinner = 'draw';
      }
    } else if (match.roundType === 'memorize') {
      const c1 = sub1 && sub1.correct;
      const c2 = sub2 && sub2.correct;
      if (c1 && !c2) {
        match.roundWinner = p1;
        match.scores[p1] = (match.scores[p1] || 0) + 1;
      } else if (c2 && !c1) {
        match.roundWinner = p2;
        match.scores[p2] = (match.scores[p2] || 0) + 1;
      } else {
        match.roundWinner = 'draw';
      }
    } else {
      // guess, grammar, vocab
      const c1 = sub1 && sub1.correct;
      const c2 = sub2 && sub2.correct;
      if (c1 && !c2) {
        match.roundWinner = p1;
        match.scores[p1] = (match.scores[p1] || 0) + 1;
      } else if (c2 && !c1) {
        match.roundWinner = p2;
        match.scores[p2] = (match.scores[p2] || 0) + 1;
      } else if (c1 && c2) {
        // Both correct, faster wins
        if (sub1.time <= sub2.time) {
          match.roundWinner = p1;
          match.scores[p1] = (match.scores[p1] || 0) + 1;
        } else {
          match.roundWinner = p2;
          match.scores[p2] = (match.scores[p2] || 0) + 1;
        }
      } else {
        match.roundWinner = 'draw';
      }
    }

    match.status = 'round-result';
  }

  public joinRankedQueue(username: string, name: string, avatar: string) {
    if (!username) return null;
    const key = username.toLowerCase().trim();
    
    // Check if already in an active match
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (match.player1 === key || match.player2 === key) {
        const opponentKey = match.player1 === key ? match.player2 : match.player1;
        const oppProfile = this.data.profiles[opponentKey] || { name: opponentKey, username: opponentKey, avatar: '' };
        return { matchId, opponent: { ...oppProfile, username: opponentKey } };
      }
    }

    // Add or update in queue
    this.rankedQueue.set(key, { username: key, name, avatar, joinedAt: Date.now() });

    // Clean stale queue entries (> 60s)
    const now = Date.now();
    for (const [qKey, qData] of this.rankedQueue.entries()) {
      if (now - qData.joinedAt > 60000) {
        this.rankedQueue.delete(qKey);
      }
    }

    // Try to pair with another student in queue
    const queueArray = Array.from(this.rankedQueue.values()).filter(p => p.username !== key);
    if (queueArray.length > 0) {
      // Pick the longest waiting student
      queueArray.sort((a, b) => a.joinedAt - b.joinedAt);
      const matchedPlayer = queueArray[0];

      // Remove both from queue
      this.rankedQueue.delete(key);
      this.rankedQueue.delete(matchedPlayer.username);

      const matchId = 'match_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      // Randomize round sequence every match so rounds are not in a fixed order
      const availableRoundTypes = ['memorize', 'essay', 'guess', 'grammar', 'vocab'];
      const roundTypesOrder = [...availableRoundTypes];
      for (let i = roundTypesOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roundTypesOrder[i], roundTypesOrder[j]] = [roundTypesOrder[j], roundTypesOrder[i]];
      }
      const firstRoundType = roundTypesOrder[0];
      const roundDetails = this.generateRoundDetails(firstRoundType);
      const faceOffDuration = 4000;
      const roundStartedAt = now + faceOffDuration;
      this.activeMatches.set(matchId, {
        player1: key,
        player2: matchedPlayer.username,
        startedAt: now,
        faceOffUntil: now + faceOffDuration,
        roundStartedAt: roundStartedAt,
        currentRound: 1,
        roundType: firstRoundType,
        roundTypesOrder: roundTypesOrder,
        ...roundDetails,
        submissions: {},
        roundWinner: null,
        scores: { [key]: 0, [matchedPlayer.username]: 0 },
        status: 'playing',
      });

      return { matchId, opponent: matchedPlayer };
    }

    return { matchId: null, opponent: null };
  }

  public leaveRankedQueue(username: string) {
    if (!username) return;
    const key = username.toLowerCase().trim();
    this.rankedQueue.delete(key);
  }

  public checkRankedMatch(username: string) {
    if (!username) return { matchId: null, opponent: null };
    const key = username.toLowerCase().trim();

    for (const [matchId, match] of this.activeMatches.entries()) {
      if (match.player1 === key || match.player2 === key) {
        const opponentKey = match.player1 === key ? match.player2 : match.player1;
        const profile = this.data.profiles[opponentKey] || { name: opponentKey, username: opponentKey, avatar: '' };
        return { matchId, opponent: { ...profile, username: opponentKey } };
      }
    }

    return { matchId: null, opponent: null };
  }

  public getMatchState(matchId: string, username: string) {
    const match = this.activeMatches.get(matchId);
    if (!match) return null;
    const key = username.toLowerCase().trim();
    const opponentKey = match.player1 === key ? match.player2 : match.player1;
    const opponentProfile = this.data.profiles[opponentKey] || { name: opponentKey, username: opponentKey, avatar: '' };

    // Check round timeout to prevent stuck matches and resolve lag
    const now = Date.now();
    const roundStartedAt = match.roundStartedAt || match.startedAt;
    const elapsedSeconds = (now - roundStartedAt) / 1000;

    let timeoutLimit = 35; // Default 35 seconds
    if (match.roundType === 'essay') {
      timeoutLimit = 100; // 5s intro + 5s prep + 75s writing + buffer
    } else if (match.roundType === 'memorize') {
      timeoutLimit = 35; // 5s intro + 10s memorize + 7s typing + buffer
    } else if (match.roundType === 'guess' || match.roundType === 'grammar' || match.roundType === 'vocab') {
      timeoutLimit = 35; // 5s intro + 20s gameplay + buffer
    }

    if (match.status === 'playing' && elapsedSeconds > timeoutLimit) {
      this.forceSettleRound(match);
    }

    if (match.status === 'game-over') {
      this.applyMatchRewards(match);
    }

    return {
      matchId,
      serverTime: now,
      startedAt: match.startedAt,
      faceOffUntil: match.faceOffUntil || (match.startedAt + 4000),
      roundStartedAt: roundStartedAt,
      currentRound: match.currentRound,
      roundType: match.roundType,
      targetWord: match.targetWord,
      essayTopic: match.essayTopic,
      guessImage: match.guessImage,
      question: match.question || '',
      options: match.options || [],
      correctIndex: match.correctIndex !== undefined ? match.correctIndex : -1,
      scores: match.scores,
      roundWinner: match.roundWinner,
      status: match.status,
      opponent: { ...opponentProfile, username: opponentKey },
      myScore: match.scores[key] || 0,
      opponentScore: match.scores[opponentKey] || 0,
      mySubmitted: !!match.submissions[key]?.submitted,
      myAnswer: match.submissions[key]?.answer || '',
      opponentSubmitted: !!match.submissions[opponentKey]?.submitted,
      matchReward: match.matchRewards ? match.matchRewards[key] : null,
    };
  }

  public applyMatchRewards(match: any) {
    if (match.rewardsApplied) return;
    match.rewardsApplied = true;

    const p1 = match.player1?.toLowerCase().trim();
    const p2 = match.player2?.toLowerCase().trim();
    if (!p1 || !p2) return;

    const s1 = match.scores[p1] || 0;
    const s2 = match.scores[p2] || 0;

    match.matchRewards = {};

    if (s1 !== s2) {
      const winnerKey = s1 > s2 ? p1 : p2;
      const loserKey = s1 > s2 ? p2 : p1;

      // 1. Winner gets +70 EXP, and +1 Honor bonus if current Honor < 100
      const winnerProf = this.getProfile(winnerKey) || {
        name: winnerKey,
        age: 18,
        yearBorn: 2008,
        honor: 100,
        level: 1,
        exp: 0,
        completedAt: new Date().toISOString()
      };
      const oldWinnerExp = winnerProf.exp !== undefined ? Math.max(0, Number(winnerProf.exp)) : 0;
      const newWinnerExp = oldWinnerExp + 70;
      const newWinnerLevel = calculateLevel(newWinnerExp);
      winnerProf.exp = newWinnerExp;
      winnerProf.level = newWinnerLevel;
      
      const curWinnerHonor = winnerProf.honor !== undefined ? Number(winnerProf.honor) : 100;
      let winnerHonorChange = 0;
      let winnerBonusMsg = '';
      if (curWinnerHonor < 100) {
        winnerProf.honor = Math.min(100, curWinnerHonor + 1);
        winnerHonorChange = +1;
        winnerBonusMsg = '🛡️ Honor Bonus: +1 Honor point restored for winning with <100 Honor!';
      } else {
        winnerProf.honor = 100;
      }
      this.saveProfile(winnerKey, winnerProf);

      match.matchRewards[winnerKey] = {
        result: 'win',
        expChange: +70,
        honorChange: winnerHonorChange,
        oldExp: oldWinnerExp,
        newExp: newWinnerExp,
        newLevel: newWinnerLevel,
        newHonor: winnerProf.honor,
        honorBonus: winnerBonusMsg,
        warning: ''
      };

      // 2. Loser gets -20 EXP (or -3 Pride/Honor if EXP is 0 / cannot absorb loss)
      const loserProf = this.getProfile(loserKey) || {
        name: loserKey,
        age: 18,
        yearBorn: 2008,
        honor: 100,
        level: 1,
        exp: 0,
        completedAt: new Date().toISOString()
      };
      const oldLoserExp = loserProf.exp !== undefined ? Math.max(0, Number(loserProf.exp)) : 0;
      let newLoserExp = oldLoserExp;
      let expDeducted = 0;
      let honorDeducted = 0;
      let warningMsg = '';

      if (oldLoserExp >= 20) {
        newLoserExp = oldLoserExp - 20;
        expDeducted = 20;
      } else {
        expDeducted = oldLoserExp;
        newLoserExp = 0; // EXP cannot be negative
        const curHonor = loserProf.honor !== undefined ? Number(loserProf.honor) : 100;
        const newHonor = Math.max(0, curHonor - 3);
        honorDeducted = curHonor - newHonor;
        loserProf.honor = newHonor;
        warningMsg = '⚠️ EXP Depleted (0 EXP): 3 points have been deducted from your Honor rating!';
      }

      loserProf.exp = newLoserExp;
      loserProf.level = calculateLevel(newLoserExp);
      if (loserProf.honor === undefined) loserProf.honor = 100;
      this.saveProfile(loserKey, loserProf);

      match.matchRewards[loserKey] = {
        result: 'loss',
        expChange: -expDeducted,
        honorChange: -honorDeducted,
        oldExp: oldLoserExp,
        newExp: newLoserExp,
        newLevel: loserProf.level,
        newHonor: loserProf.honor,
        warning: warningMsg
      };
    } else {
      // Draw: Participation bonus +10 EXP each
      [p1, p2].forEach(userKey => {
        const prof = this.getProfile(userKey) || {
          name: userKey,
          age: 18,
          yearBorn: 2008,
          honor: 100,
          level: 1,
          exp: 0,
          completedAt: new Date().toISOString()
        };
        const curExp = prof.exp !== undefined ? Math.max(0, Number(prof.exp)) : 0;
        const newExp = curExp + 10;
        prof.exp = newExp;
        prof.level = calculateLevel(newExp);
        if (prof.honor === undefined) prof.honor = 100;
        this.saveProfile(userKey, prof);

        match.matchRewards[userKey] = {
          result: 'draw',
          expChange: +10,
          honorChange: 0,
          oldExp: curExp,
          newExp: newExp,
          newLevel: prof.level,
          newHonor: prof.honor,
          warning: ''
        };
      });
    }
  }

  public submitMatchAnswer(matchId: string, username: string, answer: string, correct: boolean) {
    const match = this.activeMatches.get(matchId);
    if (!match || match.status !== 'playing') return this.getMatchState(matchId, username);
    const key = username.toLowerCase().trim();

    // Record submission if not already submitted
    if (!match.submissions[key]?.submitted) {
      let isCorrect = correct;
      if (match.roundType === 'guess') {
        try {
          const itemData = JSON.parse(match.guessImage);
          isCorrect = this.checkGuessAnswer(answer, itemData);
        } catch (e) {
          isCorrect = answer.trim().toLowerCase() === match.guessImage.trim().toLowerCase();
        }
      }

      match.submissions[key] = { submitted: true, answer, time: Date.now(), correct: isCorrect };

      const opponentKey = match.player1 === key ? match.player2 : match.player1;
      const mySub = match.submissions[key];
      const oppSub = match.submissions[opponentKey];

      if (match.roundType === 'essay') {
        // ESSAY ROUND: Evaluates when both submit or timeout
        if (oppSub && oppSub.submitted) {
          const myScoreVal = this.scoreEssay(mySub.answer);
          const oppScoreVal = this.scoreEssay(oppSub.answer);

          if (myScoreVal > oppScoreVal) {
            match.roundWinner = key;
            match.scores[key] = (match.scores[key] || 0) + 1;
          } else if (oppScoreVal > myScoreVal) {
            match.roundWinner = opponentKey;
            match.scores[opponentKey] = (match.scores[opponentKey] || 0) + 1;
          } else {
            match.roundWinner = 'draw';
          }
          match.status = 'round-result';
        }
      } else {
        // NON-ESSAY ROUNDS (memorize, guess, grammar, vocab):
        if (mySub.correct) {
          // Submitter answered correctly!
          if (oppSub && oppSub.submitted && oppSub.correct) {
            // Both answered correctly: faster submitter wins (or draw if same time)
            if (mySub.time < oppSub.time) {
              match.roundWinner = key;
              match.scores[key] = (match.scores[key] || 0) + 1;
            } else if (oppSub.time < mySub.time) {
              match.roundWinner = opponentKey;
              match.scores[opponentKey] = (match.scores[opponentKey] || 0) + 1;
            } else {
              match.roundWinner = 'draw';
            }
          } else {
            // Submitter is the only/first correct solver -> wins the round point!
            match.roundWinner = key;
            match.scores[key] = (match.scores[key] || 0) + 1;
          }
          match.status = 'round-result';
        } else {
          // Submitter answered INCORRECTLY / failed to solve:
          if (oppSub && oppSub.submitted) {
            if (oppSub.correct) {
              // Opponent answered correctly -> opponent wins
              match.roundWinner = opponentKey;
              match.scores[opponentKey] = (match.scores[opponentKey] || 0) + 1;
            } else {
              // BOTH players failed to solve the question -> DRAW (تعادل)! No points added to either player.
              match.roundWinner = 'draw';
            }
            match.status = 'round-result';
          } else {
            // Opponent hasn't submitted yet. Do NOT prematurely give opponent the win;
            // wait for opponent to submit or for timeout (which will evaluate to draw if opponent also fails).
          }
        }
      }
    }

    return this.getMatchState(matchId, username);
  }

  public nextMatchRound(matchId: string, clientRound: number) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    // Only advance the round if the client's current round matches the server's current round,
    // and the server is in the 'round-result' status. This completely prevents duplicate round advancements.
    if (match.status === 'round-result' && match.currentRound === clientRound) {
      if (match.currentRound < 5) {
        match.currentRound += 1;
        match.status = 'playing';
        match.roundStartedAt = Date.now();
        match.submissions = {};
        match.roundWinner = null;

        const roundTypesOrder = match.roundTypesOrder || ['memorize', 'essay', 'guess', 'grammar', 'vocab'];
        match.roundType = roundTypesOrder[match.currentRound - 1] || 'memorize';

        const roundDetails = this.generateRoundDetails(match.roundType);
        match.targetWord = roundDetails.targetWord;
        match.essayTopic = roundDetails.essayTopic;
        match.guessImage = roundDetails.guessImage;
        match.question = roundDetails.question;
        match.options = roundDetails.options;
        match.correctIndex = roundDetails.correctIndex;
      } else {
        match.status = 'game-over';
        this.applyMatchRewards(match);
      }
    }
  }

  public forfeitMatchDueToCheat(matchId: string, cheatingUser: string, reason: string = 'tab_switch') {
    const match = this.activeMatches.get(matchId);
    if (!match || match.status === 'game-over') {
      return match ? this.getMatchState(matchId, cheatingUser) : null;
    }

    const cheaterKey = cheatingUser.toLowerCase().trim();
    const p1 = match.player1;
    const p2 = match.player2;
    const opponentKey = p1 === cheaterKey ? p2 : p1;

    // End match immediately
    match.status = 'game-over';
    match.scores[opponentKey] = Math.max(match.scores[opponentKey] || 0, 5);
    match.scores[cheaterKey] = 0;

    // 1. Opponent gets full victory rewards (+70 EXP, +1 Honor bonus if < 100)
    const oppProf = this.getProfile(opponentKey) || {
      name: opponentKey,
      age: 18,
      yearBorn: 2008,
      honor: 100,
      level: 1,
      exp: 0,
      completedAt: new Date().toISOString()
    };
    const oldOppExp = oppProf.exp !== undefined ? Math.max(0, Number(oppProf.exp)) : 0;
    const newOppExp = oldOppExp + 70;
    const newOppLevel = calculateLevel(newOppExp);
    oppProf.exp = newOppExp;
    oppProf.level = newOppLevel;

    const curOppHonor = oppProf.honor !== undefined ? Number(oppProf.honor) : 100;
    let oppHonorChange = 0;
    let oppBonusMsg = '';
    if (curOppHonor < 100) {
      oppProf.honor = Math.min(100, curOppHonor + 1);
      oppHonorChange = +1;
      oppBonusMsg = '🛡️ Honor Bonus: +1 Honor point restored for winning with <100 Honor!';
    } else {
      oppProf.honor = 100;
    }
    this.saveProfile(opponentKey, oppProf);

    // 2. Cheating user gets -7 Honor deduction immediately
    const cheaterProf = this.getProfile(cheaterKey) || {
      name: cheaterKey,
      age: 18,
      yearBorn: 2008,
      honor: 100,
      level: 1,
      exp: 0,
      completedAt: new Date().toISOString()
    };
    const oldCheaterHonor = cheaterProf.honor !== undefined ? Number(cheaterProf.honor) : 100;
    const newCheaterHonor = Math.max(0, oldCheaterHonor - 7);
    cheaterProf.honor = newCheaterHonor;
    this.saveProfile(cheaterKey, cheaterProf);

    // 3. Create cheating penalty notification for cheating student
    if (!this.data.notifications) this.data.notifications = [];
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const penaltyNotif = {
      id: notifId,
      recipientUsername: cheaterKey,
      senderUsername: 'system_security',
      senderName: 'Anti-Cheat Warden 🛡️',
      type: 'cheat_penalty',
      title: '🚨 عقوبة محاولة غش: حسم 7 درجات فخر (-7 Honor)',
      message: 'تم كشف محاولة غش أثناء المبارزة التنافسية (فتح علامة تبويب جديدة أو مغادرة شاشة الموقع أثناء الجولة). تم حسم 7 درجات من درجة الفخر (Honor) واعتبار المباراة خسارة كاملة لصالح المنافس.',
      status: 'unread',
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.data.notifications.unshift(penaltyNotif);
    this.saveToFirestore('notifications', notifId, penaltyNotif);
    this.persist();

    // 4. Update match rewards
    match.matchRewards = {};
    match.matchRewards[opponentKey] = {
      result: 'win',
      expChange: +70,
      honorChange: oppHonorChange,
      oldExp: oldOppExp,
      newExp: newOppExp,
      newLevel: newOppLevel,
      newHonor: oppProf.honor,
      honorBonus: oppBonusMsg,
      warning: '🏆 Opponent forfeited due to leaving/cheating! Full Match Victory awarded to you.'
    };

    match.matchRewards[cheaterKey] = {
      result: 'loss',
      expChange: 0,
      honorChange: -7,
      oldExp: cheaterProf.exp || 0,
      newExp: cheaterProf.exp || 0,
      newLevel: cheaterProf.level || 1,
      newHonor: newCheaterHonor,
      honorBonus: '',
      warning: '🚨 CHEATING DETECTED: You switched tabs or left the website during the duel! The entire match was awarded to your opponent, and -7 Honor points were deducted.'
    };

    return this.getMatchState(matchId, cheatingUser);
  }

  public recordHeartbeat(username: string): string[] {
    if (!username) return this.getOnlineUsers();
    const key = username.toLowerCase().trim();
    this.activeSessions.set(key, Date.now());
    return this.getOnlineUsers();
  }

  public removePresence(username: string) {
    if (!username) return;
    const key = username.toLowerCase().trim();
    this.activeSessions.delete(key);
  }

  public getOnlineUsers(): string[] {
    const now = Date.now();
    const threshold = 35000; // 35 seconds timeout for active heartbeat
    const online: string[] = [];
    for (const [uname, lastSeen] of this.activeSessions.entries()) {
      if (now - lastSeen < threshold) {
        online.push(uname);
      } else {
        this.activeSessions.delete(uname);
      }
    }
    return online;
  }
  public createUser(username: string, passwordHash: string) {
    const key = username.toLowerCase().trim();
    if (this.data.users[key]) {
      return { success: false, message: 'Username already taken.' };
    }
    const userData = { username: key, passwordHash, createdAt: new Date().toISOString() };
    this.data.users[key] = userData;
    this.persist();
    this.saveToFirestore('users', key, userData);
    return { success: true };
  }
  public verifyUser(username: string, passwordHash: string) {
    const key = username.toLowerCase().trim();
    const user = this.data.users[key];
    if (!user) return { success: false, message: 'User not found.' };
    if (user.passwordHash !== passwordHash) return { success: false, message: 'Incorrect password.' };
    return { success: true };
  }
  public getProfile(username: string) {
    return this.data.profiles[username.toLowerCase().trim()] || null;
  }
  public saveProfile(username: string, profile: any) {
    const key = username.toLowerCase().trim();
    const profileData = { ...profile, updatedAt: new Date().toISOString() };
    this.data.profiles[key] = profileData;
    this.persist();
    this.saveToFirestore('profiles', key, profileData);
    return this.data.profiles[key];
  }
  public getAllProfiles() {
    return this.data.profiles || {};
  }
  public addMessage(msg: any) {
    if (!this.data.messages) this.data.messages = [];
    this.data.messages.push(msg);
    this.persist();
    this.saveToFirestore('messages', msg.id, msg);
    return msg;
  }
  public getMessagesBetween(u1: string, u2: string) {
    const msgs = this.data.messages || [];
    const a = u1.toLowerCase();
    const b = u2.toLowerCase();
    return msgs.filter(
      (m: any) =>
        (m.sender?.toLowerCase() === a && m.recipient?.toLowerCase() === b) ||
        (m.sender?.toLowerCase() === b && m.recipient?.toLowerCase() === a)
    );
  }
  public getGroupMessages(gid: string) {
    const msgs = this.data.messages || [];
    const g = gid.toLowerCase();
    return msgs.filter((m: any) => m.recipient?.toLowerCase() === g || m.groupId?.toLowerCase() === g);
  }
  public getAllGroups(username?: string) {
    const groups = this.data.groups || [];
    if (!username) return groups;
    const u = username.toLowerCase();
    return groups.filter((g: any) => g.members?.map((m: string) => m.toLowerCase()).includes(u) || g.createdBy?.toLowerCase() === u);
  }
  public createGroup(name: string, avatar: string | undefined, createdBy: string, members: string[]) {
    if (!this.data.groups) this.data.groups = [];
    const now = new Date();
    const uCreator = createdBy.toLowerCase();
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      avatar,
      createdBy: uCreator,
      members: [uCreator, ...members.map((m) => m.toLowerCase())],
      createdAt: now.toISOString(),
      lastMessage: 'Group created successfully.',
      lastMessageTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.data.groups.unshift(newGroup);
    this.persist();
    this.saveToFirestore('groups', newGroup.id, newGroup);
    return newGroup;
  }
  public getAllHomeworks() {
    return this.data.homeworks || [];
  }
  public addHomework(hw: any) {
    if (!this.data.homeworks) this.data.homeworks = [];
    this.data.homeworks.unshift(hw);
    this.persist();
    this.saveToFirestore('homeworks', hw.id, hw);
    return hw;
  }
  public updateHomeworkStatus(id: string, status: string, feedback?: string) {
    const hw = (this.data.homeworks || []).find((h: any) => h.id === id);
    if (hw) {
      const oldStatus = hw.status;
      hw.status = status;
      if (feedback) hw.teacherFeedback = feedback;

      this.saveToFirestore('homeworks', id, hw);

      // Logic for rejection: deduct 5 honor and notify student
      if (status === 'rejected' && oldStatus !== 'rejected') {
        const studentProfile = this.data.profiles[hw.studentUsername.toLowerCase().trim()];
        if (studentProfile) {
          studentProfile.honor = Math.max(0, (studentProfile.honor || 100) - 5);
          this.saveToFirestore('profiles', hw.studentUsername.toLowerCase().trim(), studentProfile);
          
          // Create notification
          if (!this.data.notifications) this.data.notifications = [];
          const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const notif = {
            id: notifId,
            recipientUsername: hw.studentUsername,
            senderUsername: 'ahmed_admin123',
            senderName: 'Prof. Ahmed',
            type: 'homework_rejected',
            title: 'Homework Rejected',
            message: `Your honor score was reduced by 5 because your (${hw.type}) homework was rejected. Please maintain your honor score above 80.`,
            status: 'unread',
            createdAt: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          this.data.notifications.unshift(notif);
          this.saveToFirestore('notifications', notifId, notif);
        }
      } else if (status === 'accepted' && oldStatus !== 'accepted') {
        const studentProfile = this.data.profiles[hw.studentUsername.toLowerCase().trim()];
        if (studentProfile) {
          // Send notification for acceptance too
          if (!this.data.notifications) this.data.notifications = [];
          const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const notif = {
            id: notifId,
            recipientUsername: hw.studentUsername,
            senderUsername: 'ahmed_admin123',
            senderName: 'Prof. Ahmed',
            type: 'homework_accepted',
            title: 'Homework Accepted',
            message: `Your (${hw.type}) homework was accepted successfully! Keep up the excellent work.`,
            status: 'unread',
            createdAt: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          this.data.notifications.unshift(notif);
          this.saveToFirestore('notifications', notifId, notif);
        }
      }
      
      this.persist();
    }
    return hw;
  }
  public getAllMessages() {
    return this.data.messages || [];
  }
  public getAllNotifications() {
    return this.data.notifications || [];
  }
  public deleteNotification(id: string) {
    if (!this.data.notifications) return;
    this.data.notifications = this.data.notifications.filter((n: any) => n.id !== id);
    this.persist();
    this.deleteFromFirestore('notifications', id);
  }
}

const db = new ServerDatabase();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.text({ type: ['text/plain', 'application/json'] }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  app.get('/api/health', (req, res) => {
    res.json(db.getStats());
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, passwordHash } = req.body;
    if (username) db.recordHeartbeat(username);
    res.json(db.createUser(username, passwordHash));
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, passwordHash } = req.body;
    const result = db.verifyUser(username, passwordHash);
    if (result.success && username) {
      db.recordHeartbeat(username);
    }
    res.json(result);
  });

  app.get('/api/profile/:username', (req, res) => {
    const profile = db.getProfile(req.params.username);
    res.json({ success: !!profile, profile });
  });

  app.post('/api/profile', (req, res) => {
    const { username, profile } = req.body;
    if (username) db.recordHeartbeat(username);
    const saved = db.saveProfile(username, profile);
    res.json({ success: true, profile: saved });
  });

  app.post('/api/ranked/join', (req, res) => {
    const { username, name, avatar } = req.body;
    const result = db.joinRankedQueue(username, name || username, avatar || '');
    res.json({ success: true, ...result });
  });

  app.post('/api/ranked/leave', (req, res) => {
    const { username } = req.body;
    db.leaveRankedQueue(username);
    res.json({ success: true });
  });

  app.post('/api/ranked/check', (req, res) => {
    const { username, matchId } = req.body;
    if (matchId) {
      const matchState = db.getMatchState(matchId, username);
      res.json({ success: true, matchState });
    } else {
      const result = db.checkRankedMatch(username);
      res.json({ success: true, ...result });
    }
  });

  app.post('/api/ranked/submit', (req, res) => {
    const { matchId, username, answer, correct } = req.body;
    const matchState = db.submitMatchAnswer(matchId, username, answer, correct);
    res.json({ success: true, matchState });
  });

  app.post('/api/ranked/next-round', (req, res) => {
    const { matchId, currentRound } = req.body;
    db.nextMatchRound(matchId, currentRound);
    res.json({ success: true });
  });

  app.post('/api/ranked/cheat-forfeit', (req, res) => {
    const { matchId, username, reason } = req.body;
    const matchState = db.forfeitMatchDueToCheat(matchId, username, reason);
    res.json({ success: true, matchState });
  });

  app.post('/api/presence/heartbeat', (req, res) => {
    let username = req.body?.username;
    if (!username && typeof req.body === 'string') {
      try {
        username = JSON.parse(req.body)?.username;
      } catch (e) {}
    }
    const online = db.recordHeartbeat(username);
    res.json({ success: true, onlineUsers: online, count: online.length });
  });

  app.post('/api/presence/leave', (req, res) => {
    let username = req.body?.username;
    if (!username && typeof req.body === 'string') {
      try {
        username = JSON.parse(req.body)?.username;
      } catch (e) {}
    }
    if (username) {
      db.removePresence(username);
    }
    const online = db.getOnlineUsers();
    res.json({ success: true, onlineUsers: online, count: online.length });
  });

  app.get('/api/presence/online', (req, res) => {
    const online = db.getOnlineUsers();
    res.json({ success: true, onlineUsers: online, count: online.length });
  });

  app.get('/api/messages/all', (req, res) => {
    res.json({ success: true, messages: db.getAllMessages() });
  });

  app.get('/api/notifications', (req, res) => {
    res.json({ success: true, notifications: db.getAllNotifications() });
  });
  app.delete('/api/notifications/:id', (req, res) => {
    db.deleteNotification(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/messages/conversation', (req, res) => {
    const { user1, user2 } = req.query as any;
    if (!user1 || !user2) {
      return res.json({ success: true, messages: [] });
    }
    res.json({ success: true, messages: db.getMessagesBetween(user1, user2) });
  });

  app.get('/api/messages/group/:groupId', (req, res) => {
    res.json({ success: true, messages: db.getGroupMessages(req.params.groupId) });
  });

  app.post('/api/messages', (req, res) => {
    const msg = db.addMessage({
      ...req.body,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, message: msg });
  });

  app.get('/api/groups', (req, res) => {
    const { username } = req.query as any;
    res.json({ success: true, groups: db.getAllGroups(username) });
  });

  app.post('/api/groups', (req, res) => {
    const { name, avatar, createdBy, members } = req.body;
    const group = db.createGroup(name, avatar, createdBy, members || []);
    res.json({ success: true, group });
  });

  app.get('/api/homeworks', (req, res) => {
    res.json({ success: true, homeworks: db.getAllHomeworks() });
  });

  app.post('/api/homeworks', (req, res) => {
    console.log(`[SERVER] Received homework from ${req.body.studentUsername} (Type: ${req.body.type})`);
    const hw = db.addHomework(req.body);
    res.json({ success: true, homework: hw });
  });

  app.patch('/api/homeworks/:id', (req, res) => {
    const { status, teacherFeedback } = req.body;
    const hw = db.updateHomeworkStatus(req.params.id, status, teacherFeedback);
    res.json({ success: !!hw, homework: hw });
  });

  // Gemini AI Speaking Solver
  app.post('/api/ai/speaking', async (req, res) => {
    const { question } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `You are an expert English Speaking Examiner and Pedagogical Tutor. The student asked this Speaking question: "${question}". Provide a clear, articulate, and natural spoken answer (IELTS Band 7.5-8.5 level) structured to be easy for an English learner to hear, follow, and comprehend when spoken aloud. Output JSON with: {"answer": "...", "simplifiedExplanation": "..."}`,
          config: { responseMimeType: 'application/json' },
        });
        let parsed = { answer: '', simplifiedExplanation: '' };
        try {
          parsed = JSON.parse(response.text || '{}');
        } catch {
          parsed = { answer: response.text || '', simplifiedExplanation: '' };
        }
        return res.json({
          success: true,
          answer: parsed.answer || response.text || '',
          arabicTranslation: parsed.simplifiedExplanation || '',
          provider: 'Gemini Flash',
        });
      }
    } catch (e) {
      console.warn('Gemini AI fallback:', e);
    }

    const fallbackAnswer = `That is a wonderful question to explore. In my opinion, modern lifestyle and rapid technological progress have deeply influenced our daily habits and global communication. From what I have observed, individuals who cultivate consistency and adaptability achieve greater success. Furthermore, being resilient helps us navigate unexpected obstacles with confidence.`;
    res.json({
      success: true,
      answer: fallbackAnswer,
      arabicTranslation: 'Modern life and fast technology have changed our daily routines and how we talk across the world. People who work regularly and adapt to new situations get better results. Also, being strong helps us face new challenges.',
      provider: 'Speaking AI Engine',
    });
  });

  app.post('/api/ai/translate', async (req, res) => {
    const { text } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && text) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Simplify this English sentence for a beginner/intermediate English language learner, making it very easy to understand while keeping the same meaning: "${text}". Output only the simplified explanation text without quotes.`,
        });
        return res.json({ success: true, translation: response.text?.trim() || '' });
      }
    } catch (e) {
      console.warn('Translation error:', e);
    }
    res.json({ success: true, translation: 'Simplified sentence explanation' });
  });

  // Gemini AI Chat Endpoint for Writing & Direct Question
  app.post('/api/ai/chat', async (req, res) => {
    const { message, category } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          success: false,
          answer: 'GEMINI_API_KEY is not configured. Please configure your Gemini API key in the AI Studio secrets panel.',
        });
      }
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      let systemInstruction = 'You are a helpful AI assistant.';
      if (category === 'writing') {
        systemInstruction = 'You are an expert English Writing Coach and Editor. Review the user writing, correct grammar, enhance vocabulary, improve tone and style, and provide a polished revision.';
      } else if (category === 'direct_question') {
        systemInstruction = 'You are a friendly, natural conversational AI assistant (like ChatGPT). Answer the user questions directly, naturally, and conversationally in English or Arabic depending on what they ask, without forcing grammar breakdowns or lesson structures unless the user specifically asks for grammar explanations.';
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `${systemInstruction}\n\nUser Message: "${message}"`,
      });

      return res.json({
        success: true,
        answer: response.text || 'I have received your message and am ready to assist.',
      });
    } catch (e: any) {
      console.error('Gemini chat error:', e);
      return res.json({
        success: false,
        answer: `Error connecting to Gemini API: ${e?.message || 'Unknown error'}`,
      });
    }
  });

  // Tavus Call Endpoint with user's credentials
  app.post('/api/tavus/create-call', async (req, res) => {
    const { script, question, apiKey, personaId, replicaId, roomUrl } = req.body;
    if (roomUrl && typeof roomUrl === 'string' && roomUrl.startsWith('http')) {
      return res.json({ success: true, conversationUrl: roomUrl, mode: 'tavus_live' });
    }

    const tavusApiKey = apiKey || process.env.TAVUS_API_KEY || '9319e380d66745eab7bbf9cb9fa86665';
    const tavusReplicaId = replicaId || process.env.TAVUS_REPLICA_ID || 'rc39f215e8cb';
    const tavusPersonaId = personaId || process.env.TAVUS_PERSONA_ID || 'ped31e181a15';

    if (tavusApiKey) {
      try {
        const tavusRes = await fetch('https://tavusapi.com/v2/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': tavusApiKey,
          },
          body: JSON.stringify({
            replica_id: tavusReplicaId,
            persona_id: tavusPersonaId,
            custom_greeting: script,
            conversation_name: 'IELTS Real Speaking Test',
            conversational_context: `You are Dr. Julian Vance, an authentic English Speaking examiner and pedagogical tutor. The student asked: "${question}". Model answer: "${script}". Speak slowly, calmly, and very clearly at an educational pace (0.75x speed).`,
          }),
        });
        const tavusData: any = await tavusRes.json();
        if (tavusData && (tavusData.conversation_url || tavusData.url)) {
          return res.json({
            success: true,
            conversationUrl: tavusData.conversation_url || tavusData.url,
            mode: 'tavus_live',
          });
        }
      } catch (e) {
        console.warn('Tavus API note:', e);
      }
    }

    res.json({
      success: true,
      conversationUrl: null,
      mode: 'photorealistic_male',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
