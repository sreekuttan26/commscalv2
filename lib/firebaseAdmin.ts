import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

function getDb(): Firestore {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      }),
    })
  }
  return getFirestore()
}

// Proxy defers initializeApp until the first property access (request time, not build time)
export const adminDb = new Proxy<Firestore>({} as Firestore, {
  get(_, prop: string | symbol) {
    const db = getDb()
    const val = Reflect.get(db, prop)
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(db) : val
  },
})
