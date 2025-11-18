import { XClient } from "./xClient.js";
import admin from "firebase-admin";
const X_TOKENS_COLLECTION = "xTokens";
let firestoreInitialized = false;
function ensureFirestore() {
    if (firestoreInitialized)
        return;
    if (!admin.apps.length) {
        // On Cloud Run this will use the default service account / project.
        // Locally, you'll need GOOGLE_APPLICATION_CREDENTIALS set.
        admin.initializeApp();
    }
    firestoreInitialized = true;
}
export async function loadUserXCreds(userId) {
    ensureFirestore();
    const db = admin.firestore();
    const docRef = db.collection(X_TOKENS_COLLECTION).doc(userId);
    const snap = await docRef.get();
    if (!snap.exists)
        return null;
    const data = snap.data() ?? {};
    if (!data.accessToken || !data.refreshToken) {
        return null;
    }
    return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        // stored as number (seconds since epoch); coerce if needed
        expiresAt: typeof data.expiresAt === "number"
            ? data.expiresAt
            : Number(data.expiresAt ?? 0),
        twitterUserId: data.twitterUserId ?? "",
        twitterHandle: data.twitterHandle,
    };
}
export async function saveUserXCreds(userId, creds) {
    ensureFirestore();
    const db = admin.firestore();
    const docRef = db.collection(X_TOKENS_COLLECTION).doc(userId);
    await docRef.set({
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken,
        expiresAt: creds.expiresAt,
        twitterUserId: creds.twitterUserId,
        twitterHandle: creds.twitterHandle ?? null,
    }, { merge: true });
}
export async function ensureValidXCreds(userId, creds) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (!creds.expiresAt || creds.expiresAt <= nowSec + 60) {
        const client = new XClient();
        const refreshed = await client.refreshTokens(creds.refreshToken);
        const merged = {
            ...creds,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
            twitterUserId: refreshed.twitterUserId || creds.twitterUserId,
        };
        await saveUserXCreds(userId, merged);
        return merged;
    }
    return creds;
}
