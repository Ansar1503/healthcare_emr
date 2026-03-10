import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
};

const initialState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken') || null,
  isLoading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return { ...state, user: null, accessToken: null, isLoading: false, error: null };
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Persist user and token to localStorage
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('user');
    }
    if (state.accessToken) {
      localStorage.setItem('accessToken', state.accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [state.user, state.accessToken]);

  // Listen for forced logout (token refresh failure)
  useEffect(() => {
    const handleForcedLogout = () => {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (!state.accessToken) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }
      try {
        const { data } = await authService.getMe();
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: state.user, accessToken: state.accessToken },
        });
      } catch {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };
    verifyAuth();
  }, []); // eslint-disable-line

  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    try {
      const { data } = await authService.login({ email, password });
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: data.data.user,
          accessToken: data.data.accessToken,
        },
      });
      return { success: true, role: data.data.user.role };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  const value = {
    user: state.user,
    accessToken: state.accessToken,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.role === 'super_admin',
    isDoctor: state.user?.role === 'doctor',
    isReceptionist: state.user?.role === 'receptionist',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
