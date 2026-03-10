import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { authService } from "../services";
import type { IAuthState, AuthAction, IUser, UserRole } from "../types";

const authReducer = (state: IAuthState, action: AuthAction): IAuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isLoading: false,
        error: null,
      };
    case "LOGOUT":
      return { user: null, accessToken: null, isLoading: false, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
};

const initialState: IAuthState = {
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "null") as IUser | null;
    } catch {
      return null;
    }
  })(),
  accessToken: localStorage.getItem("accessToken"),
  isLoading: true,
  error: null,
};

interface AuthContextValue extends IAuthState {
  login: (
    email: string,
    password: string,
  ) => Promise<
    { success: true; role: UserRole } | { success: false; message: string }
  >;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isReceptionist: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (state.user) {
      localStorage.setItem("user", JSON.stringify(state.user));
    } else {
      localStorage.removeItem("user");
    }
    if (state.accessToken) {
      localStorage.setItem("accessToken", state.accessToken);
    } else {
      localStorage.removeItem("accessToken");
    }
  }, [state.user, state.accessToken]);

  useEffect(() => {
    const handler = () => dispatch({ type: "LOGOUT" });
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (!state.accessToken) {
        dispatch({ type: "LOGOUT" });
        return;
      }
      try {
        const { data } = await authService.getMe();
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: data.data!, accessToken: state.accessToken! },
        });
        dispatch({ type: "SET_LOADING", payload: false });
      } catch {
        dispatch({ type: "LOGOUT" });
      }
    };
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { data } = await authService.login({ email, password });
      const { user, accessToken } = data.data!;
      dispatch({ type: "LOGIN_SUCCESS", payload: { user, accessToken } });
      return { success: true as const, role: user.role };
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Login failed";
      dispatch({ type: "SET_ERROR", payload: message });
      return { success: false as const, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {}
    dispatch({ type: "LOGOUT" });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.role === "super_admin",
    isDoctor: state.user?.role === "doctor",
    isReceptionist: state.user?.role === "receptionist",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
