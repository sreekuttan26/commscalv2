'use client'
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react'
import { auth } from '../firebase/firebase';
import Googleauth from './Googleauth';
import { useUsers } from '../constants';

import{ getRegistedUsers} from "../firebase/firebase";




const Login = () => {
    const [reg_users, setReg_users] = useState<any[]>([]);
    const[loading,setLoading]=useState(true);

    useEffect(()=>{
        getRegistedUsers()
        .then(users=>setReg_users(users??[]))
        .finally(()=>setLoading(false));
    

    },[getRegistedUsers]);

    
    const userlist=reg_users.map(user=>user.email);



    const [username, setUsername] = useState<string | null>("null");
    const [useremail, setUseemail] = useState<string | null>("");
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {

            console.log("Authorized users:", userlist);
            console.log("Current user email:", user?.email);

            if (userlist.includes(user?.email ? user.email : "")) {
                setUsername(user?.displayName ?? "Login");
                setUseemail(user?.email ?? "");
            } else {
                setUsername("null");
                setUseemail("");
                if (user && !loading) {
                    auth.signOut()
                    
                    alert("You are not an authorized user. Please contact admin.");
                }

                
            }
        });
        return () => unsubscribe();
    }, [loading]);




    if(loading){
        return <div className=' w-screen h-screen overflow-hidden flex text-sm text-gray-500 bg-blue-50 justify-around items-center p-2 z-60  '>verifying user...</div>}
    else{

 
   




    return (
        <div className={`${!useremail?.includes("@") ? "flex w-screen h-screen overflow-hidden" : "hidden"}  bg-blue-50 justify-around items-center p-2 z-60  `}>
            <div className='  overflow-hidden border-2 p-4 rounded-xl bg-white shadow-lg flex flex-col gap-4 justify-center items-center border-blue-200 max-w-[30%]'>
                <h1 className='w-full text-xl font-medium text-gray-700'>Login</h1>
                <p className='text-sm'>Please sign in using your registerd email address. Please note that the same email addess has to be pre-registed by the admin before login. </p>
                <Googleauth />

            </div>


        </div>
    )}
}

export default Login
