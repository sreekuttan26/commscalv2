'use client'

import { onAuthStateChanged, User } from "firebase/auth"
import { createContext, ReactNode, use, useContext, useEffect, useState } from "react"
import { auth, db, getRegistedUsers, firestore } from "../firebase/firebase"
import { doc, getDoc } from "firebase/firestore"

type appContexType = {
    user: User | null,
    isRegUser: boolean,
    loading: boolean
}

const myAppContext = createContext<appContexType | null>(null)
export const MyAppContextProvider = ({children}:{children:ReactNode}) => {
    const [loggedinUser, SetLoggedinUser] = useState<User | null>(null)
    const [isRegUser, SetIsRegUser] = useState(false)
    const[loading, setIsLoading]=useState(true)


    useEffect(() => {
        const unSubscribe = onAuthStateChanged(auth, async (user) => {
            if (user?.email?.endsWith('@atree.org')) {
                //checkifUserRegistered(user.email)
                SetLoggedinUser(user)
                setIsLoading(false)

            } else if(user?.email==="ananyapathak.emailme@gmail.com"){
                SetLoggedinUser(user)
                setIsLoading(false)

            }
            
            else {
                 SetLoggedinUser(null)
                setIsLoading(false)
                //SetIsRegUser(false)

            }

        })

        return () => unSubscribe()

    }, [])

    useEffect(()=>{
      const regusercheck=async()=>{
          try{
            if(!loggedinUser?.email) return 
           // const userRef = doc(firestore, 'reg_users', 'sreekuttan@atree.org')
            const userRef = doc(firestore, 'reg_users', loggedinUser?.email)
            const regUser = await getDoc(userRef)
            
            SetIsRegUser( regUser.exists())
        }catch(e){
           console.log(e)
        }
      }

      regusercheck()
        

    },[loggedinUser])

    // const checkifUserRegistered = async (email: string) => {
    //     try {
    //         const userRef = doc(firestore, 'reg_User', email)
    //         const regUser = await getDoc(userRef)
            
    //         SetIsRegUser( regUser.exists())
    //     } catch (e) {
    //         console.log(e)
    //     }


    // }

    const value={
        user:loggedinUser,
        loading:loading,
        isRegUser:isRegUser
    }

    return <myAppContext.Provider value={value} >
        {children}

    </myAppContext.Provider>

}

export const UserMyAppContext=()=>{
    const context=useContext(myAppContext);
    if(!context){        
        console.log('No context found')
        throw new Error("Error in context")
    }
    return context;

}
