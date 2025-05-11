import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
import Login, { loginAction } from './pages/Login';
import Signup, { signupAction } from './pages/Signup';
import MainLayout, { mainLayoutLoader } from './layouts/MainLayout';
import Error404 from './pages/Error404';
import AuthLayout, { authLoader } from './layouts/AuthLayout';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import PlaylistPage from './pages/PlaylistPage';

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <MainLayout><Home /></MainLayout>,
      loader: mainLayoutLoader
    },
    {
      path: "/playlist/:name",
      element: <MainLayout><PlaylistPage /></MainLayout>,
      loader: mainLayoutLoader
    },
    {
      path: "/login",
      element: <AuthLayout><Login /></AuthLayout>,
      action: loginAction,
      loader: authLoader
    },
    {
      path: "/signup",
      element: <AuthLayout><Signup /></AuthLayout>,
      action: signupAction,
      loader: authLoader
    },
    {
      path: "*",
      element: <Error404 />,
    },
  ]);

  return (
    <RouterProvider router={router} />
  )
}

export default App
