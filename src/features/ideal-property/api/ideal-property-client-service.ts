import { db } from "@/src/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { PropertyPreference } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

const COLLECTION_NAME = "propertyPreferences";

const RATING_KEYS = [
  "includeCommonFee", "noKeyMoney", "noDeposit",
  "airConditioning", "floorHeating", "keroseneHeating", "gasHeating",
  "underfloorStorage", "shoesBox", "trunkRoom", "walkInCloset",
  "autoLock", "caretaker", "tvIntercom", "securityCamera", "securityCompany",
  "parkingAvailable", "parkingTwoOrMore", "onSiteParking", "bicycleParking", "motorcycleParking",
  "elevator", "deliveryBox", "onSiteGarbage", "balcony", "roofBalcony", "privateGarden",
  "cityGas", "lpg", "barrierFree",
  "designers", "itExplanation", "condominiumRental", "noGuarantor", "towerMansion", "renovated", "renovation",
  "immediateOccupancy", "womenOnly", "elderlyWelcomed", "lgbtFriendly", "petNegotiable", "instrumentNegotiable",
  "officeUse", "roomShare", "customizable", "diy", "noFixedTerm",
  "freeRent", "tokuyuRent",
  "todayNew", "recentNew", "videoAttached", "panoramaAttached", "floorPlanAttached", "photoAttached",
  "firstFloor", "secondFloorOrAbove", "topFloor", "cornerRoom", "southFacing",
  "gasStove", "ihStove", "twoOrMoreStoves", "allElectric", "systemKitchen", "counterKitchen",
  "bathToiletSeparate", "washlet", "bathroomDryer", "reheatingBath", "showerRoom",
  "internetConnected", "bsAntenna", "csAntenna", "cableTv", "internetFree",
  "indoorLaundry", "independentWashroom", "flooring", "maisonette", "loft", "soundproof", "basement", "furnished", "appliancesAttached"
] as const;

function sanitizePropertyPreference(pref: any): PropertyPreference {
  const sanitized = { ...pref };
  RATING_KEYS.forEach((key) => {
    const val = sanitized[key];
    if (val === true) {
      sanitized[key] = 10;
    } else if (val === false || val === undefined || val === null) {
      sanitized[key] = 0;
    } else {
      sanitized[key] = Number(val);
    }
  });
  return sanitized as PropertyPreference;
}

/**
 * ユーザーの希望物件条件を取得する
 */
export async function getPropertyPreference(uid: string): Promise<PropertyPreference | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = toPlainObject(snap);
      return sanitizePropertyPreference(data);
    }
    return null;
  } catch (error) {
    console.error("Error getting property preference:", error);
    return null;
  }
}

/**
 * ユーザーの希望物件条件を保存する
 */
export async function savePropertyPreference(uid: string, data: Partial<PropertyPreference>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, uid);
  await setDoc(docRef, {
    ...data,
    uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
