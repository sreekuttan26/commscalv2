// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, orderByChild, ref, query, get, onValue } from "firebase/database";
import { collection, getDocs, getFirestore, onSnapshot } from "firebase/firestore";
import { itemprobes } from "../constants";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSIEeIeqihGeK0oneBsSBr85EKPNTGInw",
  authDomain: "commscalv2.firebaseapp.com",
  databaseURL: "https://commscalv2-default-rtdb.firebaseio.com",
  projectId: "commscalv2",
  storageBucket: "commscalv2.firebasestorage.app",
  messagingSenderId: "1021768308649",
  appId: "1:1021768308649:web:a1bc8de6c84494b88216b8"
};

// Initialize Firebase
 const app = initializeApp(firebaseConfig);
  export const db = getDatabase(app);
  export  const auth = getAuth(app);
  export const firestore=getFirestore(app);


//onetime read realtime database
  const getitemsfromdb=async()=>{
    const itemref=ref(db,"/items/")
    const sortquery=query(itemref, orderByChild("date"));

    get(sortquery).then((snapshot)=>{
      const entrylist:itemprobes[]=[]

        if(snapshot.exists()){
          snapshot.forEach((childSnapshot)=>{
            const id=childSnapshot.key!;
            const item=childSnapshot.val();

            entrylist.push({id, ...item})
          })          

        }else{
          console.log("No data available");
        }
    })
  }

  //listen to changes in realtime database
  export const listenToItems=(callback:(items:itemprobes[])=>void)=>{
    const itemref=ref(db,"/items/")
    const sortquery=query(itemref,orderByChild("date"));

    onValue(sortquery,(snapshot)=>{
      const entrylist:itemprobes[]=[]

      if(snapshot.exists()){
        snapshot.forEach((childSnapshot)=>{
          const id=childSnapshot.key!;
          const item=childSnapshot.val()

          entrylist.push({id,...item})

        })
      }
      callback(entrylist.reverse());
    })
  }

  //get registered users from firestore
 
  export const getRegistedUsers=async()=>{
    try{
      const query=await getDocs(collection(firestore,"reg_users"));

      const users=query.docs.map(doc=>({
        id:doc.id,
        ...doc.data()

      }));
      // setRegUsers(users)
      return users;

    }catch(error){
      console.error("Error fetching registered users:",error);
    }finally{
      // setLoading(false);
    }
  }

  //get tasks from firestore
 
  export const getAllTasks=async()=>{
    try{
      const query=await getDocs(collection(firestore,"tasks"));

      const tasks=query.docs.map(doc=>({
        id:doc.id,
        ...doc.data()

      }));
      // setRegUsers(users)
      return tasks;

    }catch(error){
      console.error("Error fetching registered users:",error);
    }finally{
      // setLoading(false);
    }
  }

  export const listenToTasks = (callback: (tasks: any[]) => void) => {
  const tasksRef = collection(firestore, "tasks");
  return onSnapshot(tasksRef, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  });
};

  