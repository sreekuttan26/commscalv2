'use client'
import { collection, getDocs } from "firebase/firestore"
import { firestore } from "./firebase/firebase"
import { use, useCallback, useEffect, useState } from "react"


    


export const nav_items = [
    { name: "Dashboard", href: "/", icon: "/dashboard.png"},
    { name: "My Tasks", href: "/task", icon: "/task.png" },
    { name: "Database", href: "/database", icon: "/db.png"}, 
    // { name: "SM Plan", href: "/sm", icon: "/sm_plan.png" },
    // { name: "Website", href: "/website", icon: "/website.png" },
    { name: "Google sheet", href: "https://docs.google.com/spreadsheets/d/18I8QnxgKxle1-pA6Cw9_VEa6hnTk_nzAApl_IV194hc/edit?", icon: "/gs.png" },
]

export type taskprobs={
    title:string,
    url?:string,
    description?:string,
    date?:string,
    deadline?:string,
    assigned_to:string[],
    completed_by?:string[],
    current_status?:string,    
    subtitle?: string,     
    smdoc?: string,
    status?: string,
    createdon: string, 
 
   
    sm_status?: string,
    website_status?: boolean,
    category?: string,
    platform?: string,
    img_url?: string,
    mention?: string,
    remarks?: string,
     id?: string,
    
}


export type itemprobes = {
    title: string,    
    date: string,
    deadline?: string,
    smdoc?: string,
    status?: string,
    createdon: string,
    description: string,
    url: string,
    sm_status: string,
    website_status: boolean,
    category: string,
    platform: string,
    img_url: string,
    mention: string,
    remarks: string,
    id?: string,
    assigned_to?: string
}

export const categorylist = [
  "Authored Journal Articles",
  "Authored Popular Article",
  "News",
  "Video",
  "Event",
  "Featured Popular Article",
  "Podcast",
  "Book",
  "Book chapters",
  "Policy Brief",
  "C&S",
  "Announcement",
  "Report",
  "Talk@ATREE"]

export const platformlist = [
   "Systematics and Biodiversity",
  "Money Control",
  "Sociobiology",
  "food-webs",
  "climate emergency",
  "The Hindu",
  "C&S",
  "Bangalore Mirror",
  "ATREE- Website",
  "Idea for India",
  "Outlook traveller",
  "Amazon",
  "Mongabay",
  "The Sunday Guardian",
  "Facebook",
  "The Weekend Leader",
  "Down To Earth",
  "New Age",
  "Round Glass Sustain",
  "Hindu Tamil",
  "Hindustan Times",
  "Article 14",
  "Journal of Ecology",
  "Deccan Herald",
  "Biological Journal of the Linnean Society, 2023",
  "Odisha Post",
  "The Shillong Times",
  "Journal of the Entomological Research Society",
  "PNAS- Ecology",
  "Zootaxa",
  "mint",
  "Invertebrate Systematics",
  "India Spend",
  "Reptiles and Amphibians",
  "Mathrubhumi",
  "Vijay Karnataka Kannada daily",
  "Food web",
  "The Times of India",
  "Snow Leopards (Second Edition)",
  "Asian Journal of Conservation Biology",
  "Environmental Monitoring and Assessment",
  "National Herald",
  "East Mojo",
  "Agriculture india",
  "India Education Diary",
  "Biodiversity and Bioeconomy",
  "The New Indian Express",
  "Zoom",
  "Record of zoological survey of India",
  "Asian Scientist Magazine",
  "India Development Review",
  "Acta Zoologica Academiae Scientiarum Hungaricae",
  "Hydrobiologia",
  "Biodiversity Collaborative, India",
  "ICASS",
  "Entomon",
  "Systematic Entomology"]

export const mentionlist = [
   "Kamaljit S. Bawa",
  "Atul Joshi",
  "Balaram",
  "Amita Baviskar",
  "Pheroza J. Godrej",
  "R. Prabhakar",
  "Amrik S. Gill",
  "K. N. Ganeshaiah",
  "R. Uma Shankar",
  "Nithin Kamath",
  "Aravind N. A.",
  "Anushree Jadav",
  "G. Ravikanth",
  "Deepthi R. Shastry",
  "Anuja Malhotra",
  "Nobin Raja",
  "Milind Bunyan",
  "Abi Tamim Vanak",
  "Asmita Sengupta",
  "T. Ganesh",
  "Eklabya Sharma",
  "Priyadarsanan Dharma Rajan",
  "Saloni Bhatia",
  "Manan Bhan",
  "Priyanka Jamwal",
  "R. Ganesan",
  "Rajkamal Goswami",
  "Sarala Khaling",
  "Seshadri K. S.",
  "Sharachchandra Lele",
  "Shrinivas Badiger",
  "Siddappa Setty R.",
  "Siddhartha Krishnan",
  "M. Soubadra Devy",
  "Gita Sen",
  "Ravi Venkatesan",
  "Sandeep Singhal",
  "Darshan Shankar",
  "Rahul Matthan",
  "Rohini Nilekani",
  "Vamsidhar Pothula",
  "Anita Arjundas",
  "Navroz K. Dubash",
  "N. C. Narayanan",
  "Paul Robbins",
  "Robin L. Chazdon",
  "Ruth de Fries",
  "Sudhir Chella Rajan",
  "Tamara Ticktin",
  "Upmanu Lall",
  "VijayRaghavan",
  "Raj Khoshoo",
  "Ranjit Barthakur",
  "S. V. Ranganath",
  "Manasi Tata",
  "Shruti Shibulal",
  "Manoj Kumar",
  "Abhijit Dey",
  "Anirban Roy",
  "Anjan Katna",
  "Abhisikta Roy",
  "Amritha Yadav",
  "Amruta Pradhan",
  "Aneesh C. R.",
  "Anoop N. R.",
  "Anuja Anil Date",
  "Arjun Kannan",
  "Biswa Bhusana Mahapatra",
  "Chetan Misher",
  "Chitra Lakhera",
  "Deeke Doma Tamang",
  "Femi E. Benny",
  "Iravatee Majgaonkar",
  "Jintu S. Vijayan",
  "Jyoti Nair",
  "Kadambari Deshpande",
  "Kesang Bhutia",
  "Lakshmikantha N. R.",
  "Madhushri Mudke",
  "Nabasmita Malakar",
  "Nipu Kumar Das",
  "Nita Shashidharan",
  "Prachi Kardam",
  "Priya Ranganathan",
  "Ramya Ravi",
  "Rashmi Kulranjan",
  "Rashmi Mahajan",
  "Roshni Kutty",
  "Sahiti Sanaka",
  "Sarika",
  "Shruti Samanta",
  "Sminu T. V.",
  "Sneha Shahi",
  "Sri Ranjni T. S.",
  "Sumita Bhattacharyya",
  "Yogesh M. Bangal",
  "K. D. Singh",
  "K. R. Shivanna",
  "Mahesh Rangarajan",
  "Romulus Earl Whitaker",
  "Ricky Kej",
  "Sandesh Kadur",
  "Aakansha Gupta",
  "Abhijeet Kulkarni",
  "Aditya Ganesh",
  "Aditya Pradhan",
  "Anamika Menon",
  "Ananda Siddhartha",
  "ATREE",
  "Anushka Gurung",
  "Anushree Jadhav",
  "Avantika Thapa",
  "Chetan Toliya",
  "Chethana Casiker",
  "Chinta Sidharthan",
  "Dipanwita Dutta",
  "Divya Srinivasan",
  "Gautam Aredath",
  "Gowri U. N.",
  "Hymavathi P.",
  "Irfan Shakeer",
  "Ishwaryalakshmi M.",
  "Jagdish Kumar B.",
  "Jaya Peter",
  "Kailash B. R.",
  "Kedaravindan Bhaskar",
  "Keerthana R.",
  "Kimbhegowda",
  "Kishore Sharma",
  "Lakshmi Raveendran",
  "Mathivanan M.",
  "Madegowda C.",
  "Maneeja Murali",
  "Maria Antony P.",
  "Monika K.",
  "Monsoon Jyoti Gogoi",
  "Mujeeb Rahman",
  "Namrata Tiwari",
  "Sudha Iyer",
  "Namratha Murali",
  "Nilanjan Mukherjee",
  "Niranjana C.",
  "Nivedita A.",
  "Pallavi Varma Patil",
  "Pavan Kumar Thunga",
  "Pema Yangden Lepcha",
  "Pradeep Satpute",
  "Prathama S. Gavai",
  "Prathamesh S. Amberkar",
  "Rakesh",
  "Ranjith A. P.",
  "Reema Anand",
  "Sanjana Nair",
  "Saravanan A.",
  "Seena N. Karimbumkara",
  "Shruti Mokashi",
  "Sreekuttan V. N.",
  "Sriram Ravichandran",
  "Sunil G. M.",
  "Sunita Pradhan",
  "Surya Narayanan",
  "Thalavaipandi S.",
  "Thamizhazhagan S.",
  "Thanigaivel Annamalai",
  "Vardhini Suresh",
  "Venkat Ramanujam",
  "Madhavi Latha",
  "Ankila Hiremath",
  "Bejoy K. Thomas",
  "Durba Biswas",
  "Ghazala Shahabuddin",
  "Gladwin Joseph",
  "Jagdish Krishnaswamy",
  "Joydeep Bhattacharjee",
  "Kiran Asher",
  "Veena Srinivasan",
  "Rinzi Lama",
  "Teerath Rawat",
  "Obaiah B.",
  "Tanvi Agrawal",
  "Thangsuanlian Naulak",
  "Harisha R. P.",
  "Jojo T. D.",
  "Usha H.",
  "Indrani Ravi",
  "Sujata Seshan",
  "Parvathy Sundar",
  "S. Natesh",
  "Sahanashree R.",
  "Prasanna N. S.",
  "Sachin Tiwale",
  "Ujjvala Krishna",
  "Sailendra Dewan",
  "Anubhav Shori"]


  
// export const userlist:string[]=[];
 


//   try {
//     const querySnapshot = await getDocs(collection(firestore, "reg_users"));
//     const users = querySnapshot.docs.map(doc => doc.data());
//     const usersArr = querySnapshot.docs.map(doc => ({
//           id: doc.id,
//           ...doc.data()
//         }));
        

//     userlist.push(...users.map(user => user.email));
//     // You can set this to state if you want to display it
//   } catch (error) {
//     console.error("Error fetching users:", error);
//   }




export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, "reg_users"));
      const usersArr = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersArr);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect(() => {
  //   fetchUsers();
  // }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}


//   export function useUsers() {
//   const [users, setUsers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

  


//     const fetchUsers = async () => {
//       try {
//         const querySnapshot = await getDocs(collection(firestore, "reg_users"));
//         const users = querySnapshot.docs.map(doc => doc.data());
//         const usersArr = querySnapshot.docs.map(doc => ({
//           id: doc.id,
//           ...doc.data()
//         }));
//         setUsers(usersArr);
//         //  userlist.push(...users.map(user => user.email));
//       } catch (error) {
//         console.error("Error fetching users:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
 

//   useEffect(() => {
//     fetchUsers();
//   }, [fetchUsers]);

//   return { users, loading, refetch: fetchUsers };
// }


export const sheetupdateurl="https://script.google.com/macros/s/AKfycbwtSeFqApXZAzldCpwd86Dg4jlTP2-epuJ9KHtD6YYGfSvNLFyabUOEF7IDe3tI5SPUZA/exec";
export const delete_sheet_row_url="https://script.google.com/macros/s/AKfycbxQbhvBoDQvwGWIh7e6kjYpXCIMjFCUalH2TZtp01uNcgORwrGzyCofajJfyg2eGbcA/exec";



