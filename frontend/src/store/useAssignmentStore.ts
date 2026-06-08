import { create } from 'zustand';

export interface IQuestion {
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
}

export interface ISection {
  name: string;
  title: string;
  instruction: string;
  questions: IQuestion[];
}

export interface IAssessmentResult {
  schoolName: string;
  subject: string;
  class: string;
  timeAllowed: string;
  maxMarks: number;
  sections: ISection[];
}

export interface IQuestionTypeConfig {
  type: string;
  count: number;
  marks: number;
}

export interface IAssignment {
  _id: string;
  title: string;
  schoolName: string;
  subject: string;
  gradeClass: string;
  dueDate: string;
  questionsConfig: IQuestionTypeConfig[];
  additionalInstructions?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lifecycleStatus: 'ongoing' | 'due' | 'completed';
  progress: number;
  errorMsg?: string;
  result?: IAssessmentResult;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentState {
  assignments: IAssignment[];
  currentAssignment: IAssignment | null;
  activeStep: 1 | 2 | 3; // 1 = Form, 2 = Generating, 3 = Question Paper Output
  activeView: 'list' | 'create' | 'settings' | 'home' | 'toolkit'; // list dashboard, creator steps, settings, home, or toolkit view
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;

  // Authentication & Session state
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;

  // Profile properties
  schoolName: string;
  schoolAddress: string;
  schoolLogo: string;
  userName: string;
  userAvatar: string;
  darkMode: boolean;

  fetchAssignments: () => Promise<void>;
  fetchAssignmentById: (id: string) => Promise<IAssignment>;
  createAssignment: (data: any) => Promise<IAssignment>;
  regenerateAssignment: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  updateAssignmentStatus: (id: string, status: 'ongoing' | 'due' | 'completed') => Promise<void>;
  setStep: (step: 1 | 2 | 3) => void;
  setView: (view: 'list' | 'create' | 'settings' | 'home' | 'toolkit') => void;
  setCurrentAssignment: (assignment: IAssignment | null) => void;
  connectWebSocket: (assignmentId: string) => void;
  disconnectWebSocket: () => void;
  updateSettings: (settings: { schoolName?: string; schoolAddress?: string; schoolLogo?: string; userName?: string; userAvatar?: string; }) => void;
  toggleTheme: () => void;
  initializeSettings: () => void;

  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, schoolName: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
let socket: WebSocket | null = null;
const cleanAddress = (addr: string | undefined) => (addr && addr.trim() !== '' && addr !== 'Bokaro Steel City') ? addr : 'School Location Here';

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignments: [],
  currentAssignment: null,
  activeStep: 1,
  activeView: 'home',
  isLoading: false,
  error: null,
  wsConnected: false,

  // Auth details
  token: null,
  user: null,
  isAuthenticated: false,

  // Initialize statically to prevent Next.js SSR hydration mismatch
  schoolName: 'School Name Here',
  schoolAddress: 'School Location Here',
  schoolLogo: 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg',
  userName: 'Teacher Name',
  userAvatar: 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg',
  darkMode: false,

  initializeSettings: () => {
    if (typeof window !== 'undefined') {
      const darkMode = window.localStorage.getItem('qraft_dark_mode') === 'true';
      set({ darkMode });
    }
  },

  setStep: (step) => set({ activeStep: step }),

  setView: (view) => set({ activeView: view }),
  
  setCurrentAssignment: (assignment) => set({ currentAssignment: assignment }),

  updateSettings: (settings) => {
    // Backwards compatible settings update wrapper (updates profile instead)
    get().updateProfile(settings).catch((err) => console.error('Settings update error:', err));
  },

  toggleTheme: () => {
    set((state) => {
      const newMode = !state.darkMode;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('qraft_dark_mode', String(newMode));
      }
      return { darkMode: newMode };
    });
  },

  // Auth actions
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to login.');
      }

      const data = await response.json();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('qraft_token', data.token);
      }

      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        userName: data.user.name,
        schoolName: data.user.schoolName,
        schoolAddress: cleanAddress(data.user.schoolAddress),
        schoolLogo: data.user.schoolLogo || 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg',
        userAvatar: data.user.userAvatar || 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg',
        isLoading: false,
        error: null,
      });

      await get().fetchAssignments();
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, schoolName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, schoolName }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to register.');
      }

      const data = await response.json();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('qraft_token', data.token);
      }

      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        userName: data.user.name,
        schoolName: data.user.schoolName,
        schoolAddress: cleanAddress(data.user.schoolAddress),
        schoolLogo: data.user.schoolLogo || 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg',
        userAvatar: data.user.userAvatar || 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg',
        isLoading: false,
        error: null,
      });

      await get().fetchAssignments();
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('qraft_token');
    }
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      assignments: [],
      currentAssignment: null,
      activeView: 'home',
      activeStep: 1,
      userName: 'Teacher Name',
      schoolName: 'School Name Here',
      schoolAddress: 'School Location Here',
      schoolLogo: 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg',
      userAvatar: 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg',
    });
    get().disconnectWebSocket();
  },

  updateProfile: async (profileData) => {
    const token = get().token;
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update profile.');
      }

      const updatedUser = await response.json();
      set({
        user: updatedUser,
        userName: updatedUser.name,
        schoolName: updatedUser.schoolName,
        schoolAddress: cleanAddress(updatedUser.schoolAddress),
        schoolLogo: updatedUser.schoolLogo || 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg',
        userAvatar: updatedUser.userAvatar || 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg',
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update profile', isLoading: false });
      throw err;
    }
  },

  checkAuth: async () => {
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem('qraft_token');
    const darkMode = window.localStorage.getItem('qraft_dark_mode') === 'true';
    set({ darkMode });

    if (!token) {
      set({ isAuthenticated: false, token: null, user: null });
      return;
    }

    set({ isLoading: true, token });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const user = await response.json();
      set({
        user,
        isAuthenticated: true,
        userName: user.name,
        schoolName: user.schoolName,
        schoolAddress: cleanAddress(user.schoolAddress),
        schoolLogo: user.schoolLogo || 'https://i.pinimg.com/736x/c9/03/f8/c903f84b3130bee7c5b9ae6388360b25.jpg',
        userAvatar: user.userAvatar || 'https://static.vecteezy.com/system/resources/previews/015/413/618/non_2x/elegant-man-in-business-suit-with-badge-man-business-avatar-profile-picture-illustration-isolated-vector.jpg',
        isLoading: false,
      });

      await get().fetchAssignments();
    } catch (err) {
      console.warn('Auth check failed or session expired, logging out:', err);
      window.localStorage.removeItem('qraft_token');
      set({ isAuthenticated: false, token: null, user: null, isLoading: false });
    }
  },

  fetchAssignments: async () => {
    const token = get().token;
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch assignments list.');
      }
      const data = await response.json();
      set({ assignments: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch assignments', isLoading: false });
    }
  },

  fetchAssignmentById: async (id) => {
    const token = get().token;
    if (!token) throw new Error('Unauthenticated');
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch assignment details.');
      }
      const data = await response.json();
      set({ currentAssignment: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch assignment', isLoading: false });
      throw err;
    }
  },

  createAssignment: async (formData) => {
    const token = get().token;
    if (!token) throw new Error('Unauthenticated');
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create assignment.');
      }

      const created: IAssignment = await response.json();
      
      set((state) => ({
        assignments: [created, ...state.assignments],
        currentAssignment: created,
        activeView: 'create', // Switch to creative step flow
        activeStep: 2, // Shift immediately to progress animation view
        isLoading: false
      }));

      // Initiate websocket subscription
      get().connectWebSocket(created._id);

      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create assignment', isLoading: false });
      throw err;
    }
  },

  regenerateAssignment: async (id) => {
    const token = get().token;
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${id}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to trigger regeneration.');
      }

      const updated: IAssignment = await response.json();
      
      set((state) => ({
        assignments: state.assignments.map((asm) => asm._id === id ? updated : asm),
        currentAssignment: updated,
        activeView: 'create',
        activeStep: 2, // Push back into generation processing visual state
        isLoading: false
      }));

      // Connect or re-subscribe WebSocket
      get().connectWebSocket(id);

    } catch (err: any) {
      set({ error: err.message || 'Failed to regenerate assignment', isLoading: false });
    }
  },

  deleteAssignment: async (id) => {
    const token = get().token;
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete assignment.');
      }

      set((state) => ({
        assignments: state.assignments.filter((asm) => asm._id !== id),
        currentAssignment: state.currentAssignment?._id === id ? null : state.currentAssignment,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete assignment', isLoading: false });
      throw err;
    }
  },

  updateAssignmentStatus: async (id, status) => {
    const token = get().token;
    if (!token) return;
    set((state) => ({
      assignments: state.assignments.map((asm) =>
        asm._id === id ? { ...asm, lifecycleStatus: status } : asm
      ),
      currentAssignment:
        state.currentAssignment?._id === id
          ? { ...state.currentAssignment, lifecycleStatus: status }
          : state.currentAssignment,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/assignments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update status.');
      }

      const updated: IAssignment = await response.json();
      set((state) => ({
        assignments: state.assignments.map((asm) => (asm._id === id ? updated : asm)),
        currentAssignment:
          state.currentAssignment?._id === id ? updated : state.currentAssignment,
      }));
    } catch (err: any) {
      console.error('Store error updating assignment status:', err);
      set({ error: err.message || 'Failed to update assignment status.' });
      get().fetchAssignments();
    }
  },

  connectWebSocket: (assignmentId) => {
    // If an existing socket exists, disconnect first
    if (socket) {
      socket.close();
    }

    const isSecure = API_BASE_URL.startsWith('https:');
    const host = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsUrl = `${isSecure ? 'wss://' : 'ws://'}${host}`;
    console.log(`Opening WebSocket client connection to ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection successfully established.');
      set({ wsConnected: true });
      
      // Subscribe packet
      socket?.send(JSON.stringify({ type: 'subscribe', assignmentId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress' && data.assignmentId === assignmentId) {
          set((state) => {
            const updatedAssignments = state.assignments.map((asm) => 
              asm._id === assignmentId 
                ? { 
                    ...asm, 
                    progress: data.progress, 
                    status: data.status, 
                    result: data.result, 
                    errorMsg: data.errorMsg,
                    pdfUrl: data.pdfUrl 
                  }
                : asm
            );

            const updatedCurrent = state.currentAssignment && state.currentAssignment._id === assignmentId
              ? { 
                  ...state.currentAssignment, 
                  progress: data.progress, 
                  status: data.status, 
                  result: data.result, 
                  errorMsg: data.errorMsg,
                  pdfUrl: data.pdfUrl 
                }
              : state.currentAssignment;

            // Compute the correct active UI step based on progress payload
            let nextStep = state.activeStep;
            if (data.status === 'processing' || data.status === 'pending') {
              nextStep = 2; // In Progress / processing UI
            } else if (data.status === 'completed') {
              nextStep = 3; // Visual Question Paper view UI
            } else if (data.status === 'failed') {
              nextStep = 2; // Loading container shows failed error card layout
            }

            return {
              assignments: updatedAssignments,
              currentAssignment: updatedCurrent,
              activeStep: nextStep
            };
          });
        }
      } catch (err) {
        console.error('Failed parsing received websocket message payload:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket client connection error:', err);
    };

    socket.onclose = () => {
      console.log('WebSocket client disconnected.');
      set({ wsConnected: false });
      socket = null;
    };
  },

  disconnectWebSocket: () => {
    if (socket) {
      socket.close();
      socket = null;
      set({ wsConnected: false });
    }
  }
}));
