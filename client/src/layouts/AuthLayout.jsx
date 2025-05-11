import { redirect } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';


export async function authLoader() {
    const response = await fetch("http://localhost:8000/auth/verify", {
      credentials: "include",
    });
  
    if (!response.ok) {
        return null
    }
    
    return redirect('/')
}

export default function AuthLayout({children}) {
    return (
        <div className="h-screen overflow-auto pt-10 flex items-center justify-center">
            {children}

            <ToastContainer />
        </div>
    )
}