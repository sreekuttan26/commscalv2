'use client'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import React, { createContext, useEffect } from 'react'
import {auth, firestore} from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FcGoogle } from "react-icons/fc";
import { useUsers } from '../constants';



const Googleauth = () => {
    const {users, loading}=useUsers();
    const[signedinuser,setSignedinuser]=React.useState<any>(null);

    const Usecontext=createContext<any>(null);

    useEffect(()=>(

        onAuthStateChanged(auth,(user)=>{
            setSignedinuser(user);
            console.log("Signed in user:",user);
        }
    )),[onAuthStateChanged]);



 const provider = new GoogleAuthProvider();
    

    const signInWithGoogle = async () => {
        console.log("Signing in with Google...");
        try{
            await signInWithPopup(auth, provider);
          const  user= auth.currentUser;
          setSignedinuser(user);

            if (user) {
                console.log("User Info:", {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    uid: user.uid,
                });
                const userdocref=doc(firestore,"users",user.email?user.email:"");
                const userdoc=await getDoc(userdocref);
                if(userdoc.exists()){
                    console.log("User document data:", userdoc.data());
                     console.log("No such document!");
                   
               
                }else{
                    
                    console.log("User document data:", userdoc.data());
                    console.log("No such document!");
                    await setDoc(userdocref,{
                        email:user.email,
                        displayName:user.displayName,  
                        photoURL:user.photoURL,
                        uid:user.uid,
                        createdAt:new Date() 
                })
                }
            }else{
                console.log("No user is signed in.");
            }

            

        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }
    
  return (
    <div>
        <button onClick={signInWithGoogle} className='px-4 py-2  bg-white flex cursor-pointer text-blue-950 gap-2 align-middle rounded-lg shadow hover:shadow-lg hover:border-2 hover:border-blue-100'> <FcGoogle size={25} /> Sign in with Google</button>
      
   

   
    </div>
  )
}



export default Googleauth
