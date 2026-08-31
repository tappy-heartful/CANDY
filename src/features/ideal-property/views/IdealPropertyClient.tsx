"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { getPropertyPreference, savePropertyPreference } from "../api/ideal-property-client-service";
import { PropertyPreference, User as FirestoreUser } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner, errorLog } from "@/src/lib/functions";
import BackToHome from "@/src/components/Common/BackToHome";
import styles from "./IdealPropertyClient.module.css";

// 間取り・建物種別・構造・方位の定数
const ROOM_LAYOUTS = ["1R", "1K", "1DK", "1LDK", "2K", "2DK", "2LDK", "3K", "3DK", "3LDK", "4K", "4DK", "4LDK", "5K以上"];
const BUILDING_TYPES = ["マンション", "アパート", "一戸建て・その他"];
const STRUCTURES = ["鉄筋系", "鉄骨系", "木造", "ブロック・その他"];
const DIRECTIONS = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];

const RENT_OPTIONS = [
  3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
  11, 12, 13, 14, 15, 20, 25, 30
];

// こだわり条件の定数（日本語名とキーの対応）
const PREFERENCE_ITEMS = [
  // 1. 表示情報
  { key: "todayNew", label: "本日の新着物件", category: "表示情報" },
  { key: "recentNew", label: "新着（2-7日前）", category: "表示情報" },
  { key: "videoAttached", label: "物件動画・スライドショー付き", category: "表示情報" },
  { key: "panoramaAttached", label: "パノラマ付き", category: "表示情報" },
  { key: "floorPlanAttached", label: "間取り図付き", category: "表示情報" },
  { key: "photoAttached", label: "写真付き", category: "表示情報" },

  // 2. 位置
  { key: "firstFloor", label: "1階の物件", category: "位置" },
  { key: "secondFloorOrAbove", label: "2階以上", category: "位置" },
  { key: "topFloor", label: "最上階", category: "位置" },
  { key: "cornerRoom", label: "角部屋", category: "位置" },
  { key: "southFacing", label: "南向き", category: "位置" },

  // 3. キッチン
  { key: "gasStove", label: "ガスコンロ対応", category: "キッチン" },
  { key: "ihStove", label: "IHコンロ", category: "キッチン" },
  { key: "twoOrMoreStoves", label: "コンロ2口以上", category: "キッチン" },
  { key: "allElectric", label: "オール電化", category: "キッチン" },
  { key: "systemKitchen", label: "システムキッチン", category: "キッチン" },
  { key: "counterKitchen", label: "カウンターキッチン", category: "キッチン" },

  // 4. バス・トイレ
  { key: "bathToiletSeparate", label: "バス・トイレ別", category: "バス・トイレ" },
  { key: "washlet", label: "温水洗浄便座", category: "バス・トイレ" },
  { key: "bathroomDryer", label: "浴室乾燥機", category: "バス・トイレ" },
  { key: "reheatingBath", label: "追い焚き風呂", category: "バス・トイレ" },
  { key: "showerRoom", label: "シャワールーム", category: "バス・トイレ" },

  // 5. テレビ・通信
  { key: "internetConnected", label: "インターネット接続可", category: "テレビ・通信" },
  { key: "bsAntenna", label: "BSアンテナ", category: "テレビ・通信" },
  { key: "csAntenna", label: "CSアンテナ", category: "テレビ・通信" },
  { key: "cableTv", label: "ケーブルテレビ", category: "テレビ・通信" },
  { key: "internetFree", label: "インターネット無料", category: "テレビ・通信" },

  // 6. 室内設備
  { key: "indoorLaundry", label: "室内洗濯機置場", category: "室内設備" },
  { key: "independentWashroom", label: "洗面所独立", category: "室内設備" },
  { key: "flooring", label: "フローリング", category: "室内設備" },
  { key: "maisonette", label: "メゾネット", category: "室内設備" },
  { key: "loft", label: "ロフト", category: "室内設備" },
  { key: "soundproof", label: "防音室", category: "室内設備" },
  { key: "basement", label: "地下室", category: "室内設備" },
  { key: "furnished", label: "家具付", category: "室内設備" },
  { key: "appliancesAttached", label: "家電付", category: "室内設備" },

  // 7. 冷暖房
  { key: "airConditioning", label: "エアコン付き", category: "冷暖房" },
  { key: "floorHeating", label: "床暖房", category: "冷暖房" },
  { key: "keroseneHeating", label: "灯油暖房", category: "冷暖房" },
  { key: "gasHeating", label: "ガス暖房", category: "冷暖房" },

  // 8. 収納
  { key: "underfloorStorage", label: "床下収納", category: "収納" },
  { key: "shoesBox", label: "シューズボックス", category: "収納" },
  { key: "trunkRoom", label: "トランクルーム", category: "収納" },
  { key: "walkInCloset", label: "ウォークインクローゼット", category: "収納" },

  // 9. セキュリティ
  { key: "autoLock", label: "オートロック", category: "セキュリティ" },
  { key: "caretaker", label: "管理人有り", category: "セキュリティ" },
  { key: "tvIntercom", label: "TVモニタ付きインタホン", category: "セキュリティ" },
  { key: "securityCamera", label: "防犯カメラ", category: "セキュリティ" },
  { key: "securityCompany", label: "セキュリティ会社加入済", category: "セキュリティ" },

  // 10. 建物設備
  { key: "parkingAvailable", label: "駐車場あり", category: "建物設備" },
  { key: "parkingTwoOrMore", label: "駐車場2台以上", category: "建物設備" },
  { key: "onSiteParking", label: "敷地内駐車場", category: "建物設備" },
  { key: "bicycleParking", label: "駐輪場あり", category: "建物設備" },
  { key: "motorcycleParking", label: "バイク置場あり", category: "建物設備" },
  { key: "elevator", label: "エレベーター", category: "建物設備" },
  { key: "deliveryBox", label: "宅配ボックス", category: "建物設備" },
  { key: "onSiteGarbage", label: "敷地内ゴミ置場", category: "建物設備" },
  { key: "balcony", label: "バルコニー付", category: "建物設備" },
  { key: "roofBalcony", label: "ルーフバルコニー付", category: "建物設備" },
  { key: "privateGarden", label: "専用庭", category: "建物設備" },
  { key: "cityGas", label: "都市ガス", category: "建物設備" },
  { key: "lpg", label: "プロパンガス", category: "建物設備" },
  { key: "barrierFree", label: "バリアフリー", category: "建物設備" },

  // 11. その他
  { key: "designers", label: "デザイナーズ物件", category: "その他" },
  { key: "itExplanation", label: "IT重説 対応物件", category: "その他" },
  { key: "condominiumRental", label: "分譲賃貸", category: "その他" },
  { key: "noGuarantor", label: "保証人不要", category: "その他" },
  { key: "towerMansion", label: "タワーマンション", category: "その他" },
  { key: "renovated", label: "リフォーム済み", category: "その他" },
  { key: "renovation", label: "リノベーション物件", category: "その他" },

  // 12. 入居条件
  { key: "immediateOccupancy", label: "即入居可", category: "入居条件" },
  { key: "womenOnly", label: "女性限定", category: "入居条件" },
  { key: "elderlyWelcomed", label: "高齢者歓迎", category: "入居条件" },
  { key: "lgbtFriendly", label: "LGBTフレンドリー", category: "入居条件" },
  { key: "petNegotiable", label: "ペット相談可", category: "入居条件" },
  { key: "instrumentNegotiable", label: "楽器相談可", category: "入居条件" },
  { key: "officeUse", label: "事務所利用可", category: "入居条件" },
  { key: "roomShare", label: "ルームシェア可", category: "入居条件" },
  { key: "customizable", label: "カスタマイズ可", category: "入居条件" },
  { key: "diy", label: "DIY可", category: "入居条件" },
  { key: "noFixedTerm", label: "定期借家を含まない", category: "入居条件" },

  // 13. お得条件
  { key: "freeRent", label: "フリーレント", category: "お得条件" },
  { key: "tokuyuRent", label: "特定優良賃貸住宅", category: "お得条件" },
] as const;

// デフォルト値の作成
const createDefaultPreference = (uid: string): PropertyPreference => ({
  id: uid,
  uid,
  areaMemo: "",
  rentMin: 0,
  rentMax: 999,
  includeCommonFee: 0,
  noKeyMoney: 0,
  noDeposit: 0,
  roomLayouts: [],
  buildingTypes: [],
  structures: [],
  stationWalkMin: 999,
  areaMin: 0,
  areaMax: 999,
  buildingAgeMax: 999,
  directions: [],
  airConditioning: 0,
  floorHeating: 0,
  keroseneHeating: 0,
  gasHeating: 0,
  underfloorStorage: 0,
  shoesBox: 0,
  trunkRoom: 0,
  walkInCloset: 0,
  autoLock: 0,
  caretaker: 0,
  tvIntercom: 0,
  securityCamera: 0,
  securityCompany: 0,
  parkingAvailable: 0,
  parkingTwoOrMore: 0,
  onSiteParking: 0,
  bicycleParking: 0,
  motorcycleParking: 0,
  elevator: 0,
  deliveryBox: 0,
  onSiteGarbage: 0,
  balcony: 0,
  roofBalcony: 0,
  privateGarden: 0,
  cityGas: 0,
  lpg: 0,
  barrierFree: 0,
  designers: 0,
  itExplanation: 0,
  condominiumRental: 0,
  noGuarantor: 0,
  towerMansion: 0,
  renovated: 0,
  renovation: 0,
  immediateOccupancy: 0,
  womenOnly: 0,
  elderlyWelcomed: 0,
  lgbtFriendly: 0,
  petNegotiable: 0,
  instrumentNegotiable: 0,
  officeUse: 0,
  roomShare: 0,
  customizable: 0,
  diy: 0,
  noFixedTerm: 0,
  freeRent: 0,
  tokuyuRent: 0,
  todayNew: 0,
  recentNew: 0,
  videoAttached: 0,
  panoramaAttached: 0,
  floorPlanAttached: 0,
  photoAttached: 0,
  firstFloor: 0,
  secondFloorOrAbove: 0,
  topFloor: 0,
  cornerRoom: 0,
  southFacing: 0,
  gasStove: 0,
  ihStove: 0,
  twoOrMoreStoves: 0,
  allElectric: 0,
  systemKitchen: 0,
  counterKitchen: 0,
  bathToiletSeparate: 0,
  washlet: 0,
  bathroomDryer: 0,
  reheatingBath: 0,
  showerRoom: 0,
  internetConnected: 0,
  bsAntenna: 0,
  csAntenna: 0,
  cableTv: 0,
  internetFree: 0,
  indoorLaundry: 0,
  independentWashroom: 0,
  flooring: 0,
  maisonette: 0,
  loft: 0,
  soundproof: 0,
  basement: 0,
  furnished: 0,
  appliancesAttached: 0,
});

export default function IdealPropertyClient() {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [partnerUser, setPartnerUser] = useState<FirestoreUser | null>(null);
  const [myPreference, setMyPreference] = useState<PropertyPreference | null>(null);
  const [partnerPreference, setPartnerPreference] = useState<PropertyPreference | null>(null);

  const [activeTab, setActiveTab] = useState<"settings" | "partner" | "compare">("settings");
  const [isLoading, setIsLoading] = useState(true);

  // 編集用のローカルステート
  const [editForm, setEditForm] = useState<PropertyPreference | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ title: "理想の物件" }]);
  }, [setBreadcrumbs]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      showSpinner();
      const partner = await getPartnerData(user.uid);
      setPartnerUser(partner);

      const [myPref, partnerPref] = await Promise.all([
        getPropertyPreference(user.uid),
        partner ? getPropertyPreference(partner.id) : Promise.resolve(null),
      ]);

      const resolvedMyPref = myPref || createDefaultPreference(user.uid);
      setMyPreference(resolvedMyPref);
      setEditForm(JSON.parse(JSON.stringify(resolvedMyPref))); // ディープコピー

      if (partnerPref) {
        setPartnerPreference(partnerPref);
      } else if (partner) {
        setPartnerPreference(createDefaultPreference(partner.id));
      }
    } catch (e) {
      console.error("Failed to load property preferences:", e);
      errorLog("希望物件条件読み込み", e);
      showDialog("データの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user || !editForm) return;

    try {
      showSpinner();
      await savePropertyPreference(user.uid, editForm);
      hideSpinner();
      await showDialog("希望条件を保存しました！", true);
      // 再読み込みして最新化
      await loadPreferences();
      setActiveTab("compare");
    } catch (e) {
      console.error("Failed to save property preference:", e);
      errorLog("希望物件条件保存", e);
      hideSpinner();
      showDialog("保存に失敗しました。");
    }
  };

  const handleCheckboxChange = (
    field: "roomLayouts" | "buildingTypes" | "structures" | "directions",
    value: string
  ) => {
    if (!editForm) return;
    const currentList = editForm[field] || [];
    const newList = currentList.includes(value)
      ? currentList.filter((item) => item !== value)
      : [...currentList, value];

    setEditForm({ ...editForm, [field]: newList });
  };

  const handleBooleanChange = (field: keyof PropertyPreference) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: !editForm[field] });
  };

  if (isLoading || !myPreference) {
    return <div className="page-container" />;
  }

  const myName = userData?.nickname || "自分";
  const partnerName = partnerUser?.nickname || "パートナー";

  // 一致・乖離の分析計算
  const getRentRangeText = (min: number, max: number, feePriority: number) => {
    const minText = min === 0 ? "下限なし" : `${min}万円`;
    const maxText = max === 999 ? "上限なし" : `${max}万円`;
    const feeText = feePriority > 0 ? ` (管理費等込: 希望度 ${feePriority})` : " (管理費等除く)";
    return `${minText} 〜 ${maxText}${feeText}`;
  };

  // 家賃の合意算出
  const getRentAgreement = () => {
    if (!partnerPreference) return null;
    const myMin = myPreference.rentMin || 0;
    const myMax = myPreference.rentMax || 999;
    const pMin = partnerPreference.rentMin || 0;
    const pMax = partnerPreference.rentMax || 999;

    const agreedMin = Math.max(myMin, pMin);
    const agreedMax = Math.min(myMax, pMax);

    if (agreedMin > agreedMax) {
      return {
        isMatch: false,
        text: "希望価格帯が重なっていません。すり合わせが必要です 💬",
      };
    }

    const minText = agreedMin === 0 ? "" : `${agreedMin}万円以上`;
    const maxText = agreedMax === 999 ? "上限なし" : `${agreedMax}万円以下`;
    const rangeText = [minText, maxText].filter(Boolean).join("〜");

    return {
      isMatch: true,
      text: `${rangeText} の範囲でお互い納得できそうです 🏡`,
    };
  };

  // 徒歩分数の合意
  const getWalkAgreement = () => {
    if (!partnerPreference) return null;
    const myWalk = myPreference.stationWalkMin || 999;
    const pWalk = partnerPreference.stationWalkMin || 999;

    if (myWalk === 999 && pWalk === 999) return { isMatch: true, text: "お互いにこだわりなし" };

    const agreedWalk = Math.min(myWalk, pWalk);
    return {
      isMatch: true,
      text: `駅から「徒歩${agreedWalk}分以内」でお互い納得できそうです 🚶`,
    };
  };

  // 面積の合意
  const getAreaAgreement = () => {
    if (!partnerPreference) return null;
    const myMin = myPreference.areaMin || 0;
    const myMax = myPreference.areaMax || 999;
    const pMin = partnerPreference.areaMin || 0;
    const pMax = partnerPreference.areaMax || 999;

    const agreedMin = Math.max(myMin, pMin);
    const agreedMax = Math.min(myMax, pMax);

    if (agreedMin > agreedMax) {
      return { isMatch: false, text: "希望面積が重なっていません。要調整です" };
    }

    const minText = agreedMin === 0 ? "" : `${agreedMin}㎡以上`;
    const maxText = agreedMax === 999 ? "" : `${agreedMax}㎡以下`;
    const rangeText = [minText, maxText].filter(Boolean).join("〜");
    return {
      isMatch: true,
      text: `専有面積「${rangeText || "指定なし"}」でお互い納得できそうです ✨`,
    };
  };

  // 築年数の合意
  const getAgeAgreement = () => {
    if (!partnerPreference) return null;
    const myAge = myPreference.buildingAgeMax || 999;
    const pAge = partnerPreference.buildingAgeMax || 999;

    if (myAge === 999 && pAge === 999) return { isMatch: true, text: "お互いにこだわりなし" };

    const agreedAge = Math.min(myAge, pAge);
    const ageText = agreedAge === 0 ? "新築" : `築${agreedAge}年以内`;
    return {
      isMatch: true,
      text: `築年数「${ageText}」でお互い納得できそうです 🏢`,
    };
  };

  // 配列系の一致抽出
  const getArrayComparison = (field: "roomLayouts" | "buildingTypes" | "structures" | "directions") => {
    const myItems = myPreference[field] || [];
    const pItems = partnerPreference ? partnerPreference[field] || [] : [];

    const common = myItems.filter((x) => pItems.includes(x));
    const onlyMe = myItems.filter((x) => !pItems.includes(x));
    const onlyPartner = pItems.filter((x) => !myItems.includes(x));

    return { common, onlyMe, onlyPartner };
  };

  const getBasicSpecsComparison = () => {
    const common: string[] = [];
    const onlyMe: string[] = [];
    const onlyPartner: string[] = [];

    const myMin = myPreference.rentMin || 0;
    const myMax = myPreference.rentMax || 999;
    const pMin = partnerPreference ? (partnerPreference.rentMin || 0) : 0;
    const pMax = partnerPreference ? (partnerPreference.rentMax || 999) : 999;

    // 1. エリア
    if (myPreference.areaMemo && partnerPreference?.areaMemo) {
      if (myPreference.areaMemo.trim() === partnerPreference.areaMemo.trim()) {
        common.push(`希望エリア: ${myPreference.areaMemo}`);
      } else {
        common.push(`希望エリア: ${myPreference.areaMemo} / ${partnerPreference.areaMemo}`);
      }
    } else if (myPreference.areaMemo) {
      onlyMe.push(`希望エリア: ${myPreference.areaMemo}`);
    } else if (partnerPreference?.areaMemo) {
      onlyPartner.push(`希望エリア: ${partnerPreference.areaMemo}`);
    }

    // 2. 家賃
    if (partnerPreference) {
      const agreedMin = Math.max(myMin, pMin);
      const agreedMax = Math.min(myMax, pMax);
      if (agreedMin <= agreedMax) {
        common.push(`家賃合意範囲: ${agreedMin === 0 ? "下限なし" : agreedMin + "万"}〜${agreedMax === 999 ? "上限なし" : agreedMax + "万"}`);
      } else {
        onlyMe.push(`希望家賃: ${myMin === 0 ? "下限なし" : myMin + "万"}〜${myMax === 999 ? "上限なし" : myMax + "万"}`);
        onlyPartner.push(`希望家賃: ${pMin === 0 ? "下限なし" : pMin + "万"}〜${pMax === 999 ? "上限なし" : pMax + "万"}`);
      }
    }

    // 3. 管理費込・礼金・敷金
    const checkSpecs = [
      { key: "includeCommonFee", label: "管理費・共益費込み" },
      { key: "noKeyMoney", label: "礼金なし" },
      { key: "noDeposit", label: "敷金・保証金なし" },
    ];
    checkSpecs.forEach(spec => {
      const myVal = Number(myPreference[spec.key as keyof PropertyPreference] || 0);
      const pVal = partnerPreference ? Number(partnerPreference[spec.key as keyof PropertyPreference] || 0) : 0;
      if (myVal > 0 && pVal > 0) {
        common.push(`${spec.label} (自分: ${myVal}, 相手: ${pVal})`);
      } else if (myVal > 0) {
        onlyMe.push(`${spec.label} (希望度: ${myVal})`);
      } else if (pVal > 0) {
        onlyPartner.push(`${spec.label} (希望度: ${pVal})`);
      }
    });

    // 4. 配列項目 (間取り, 建物種別, 構造, 方位)
    const arrayFields = [
      { key: "roomLayouts", label: "間取り" },
      { key: "buildingTypes", label: "建物種別" },
      { key: "structures", label: "構造" },
      { key: "directions", label: "方位" },
    ] as const;
    arrayFields.forEach(field => {
      const myItems = myPreference[field.key] || [];
      const pItems = partnerPreference ? (partnerPreference[field.key] || []) : [];
      
      myItems.forEach(item => {
        if (pItems.includes(item)) {
          common.push(`${field.label}: ${item}`);
        } else {
          onlyMe.push(`${field.label}: ${item}`);
        }
      });
      pItems.forEach(item => {
        if (!myItems.includes(item)) {
          onlyPartner.push(`${field.label}: ${item}`);
        }
      });
    });

    // 5. 駅徒歩
    const myWalk = myPreference.stationWalkMin || 999;
    const pWalk = partnerPreference ? (partnerPreference.stationWalkMin || 999) : 999;
    if (myWalk !== 999 && pWalk !== 999) {
      if (myWalk === pWalk) common.push(`駅徒歩${myWalk}分以内`);
      else {
        common.push(`駅徒歩合意: 徒歩${Math.min(myWalk, pWalk)}分以内`);
        if (myWalk < pWalk) onlyMe.push(`駅徒歩${myWalk}分以内`);
        else onlyPartner.push(`駅徒歩${pWalk}分以内`);
      }
    } else if (myWalk !== 999) {
      onlyMe.push(`駅徒歩${myWalk}分以内`);
    } else if (pWalk !== 999) {
      onlyPartner.push(`駅徒歩${pWalk}分以内`);
    }

    // 6. 専有面積
    const myAreaMin = myPreference.areaMin || 0;
    const myAreaMax = myPreference.areaMax || 999;
    const pAreaMin = partnerPreference ? (partnerPreference.areaMin || 0) : 0;
    const pAreaMax = partnerPreference ? (partnerPreference.areaMax || 999) : 999;
    if (partnerPreference) {
      const agreedAreaMin = Math.max(myAreaMin, pAreaMin);
      const agreedAreaMax = Math.min(myAreaMax, pAreaMax);
      if (agreedAreaMin <= agreedAreaMax) {
        if (agreedAreaMin > 0 || agreedAreaMax < 999) {
          common.push(`面積合意: ${agreedAreaMin === 0 ? "下限なし" : agreedAreaMin + "㎡"}〜${agreedAreaMax === 999 ? "上限なし" : agreedAreaMax + "㎡"}`);
        }
      } else {
        onlyMe.push(`希望面積: ${myAreaMin}〜${myAreaMax}㎡`);
        onlyPartner.push(`希望面積: ${pAreaMin}〜${pAreaMax}㎡`);
      }
    }

    // 7. 築年数
    const myAge = myPreference.buildingAgeMax || 999;
    const pAge = partnerPreference ? (partnerPreference.buildingAgeMax || 999) : 999;
    if (myAge !== 999 && pAge !== 999) {
      if (myAge === pAge) common.push(myAge === 0 ? "新築" : `築${myAge}年以内`);
      else {
        common.push(`築年数合意: ${Math.min(myAge, pAge) === 0 ? "新築" : `築${Math.min(myAge, pAge)}年以内`}`);
        if (myAge < pAge) onlyMe.push(myAge === 0 ? "新築" : `築${myAge}年以内`);
        else onlyPartner.push(pAge === 0 ? "新築" : `築${pAge}年以内`);
      }
    } else if (myAge !== 999) {
      onlyMe.push(myAge === 0 ? "新築" : `築${myAge}年以内`);
    } else if (pAge !== 999) {
      onlyPartner.push(pAge === 0 ? "新築" : `築${pAge}年以内`);
    }

    return { common, onlyMe, onlyPartner };
  };

  const rentAgreement = getRentAgreement();
  const walkAgreement = getWalkAgreement();
  const areaAgreement = getAreaAgreement();
  const ageAgreement = getAgeAgreement();

  const renderForm = (pref: PropertyPreference, isReadOnly: boolean) => {
    return (
      <div className={styles.formContainer}>
        {isReadOnly && (
          <div className={styles.readOnlyNotice}>
            <i className="fa-solid fa-lock"></i> こちらは {partnerName} の希望条件です（編集はできません）
          </div>
        )}

        {/* 希望エリア */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-map-location-dot"></i> 住みたいエリアのメモ
          </div>
          <div className={styles.formContent}>
            <input
              type="text"
              className={styles.appInput}
              placeholder={isReadOnly ? "未入力" : "例: 松山市、城北エリア、駅近など"}
              value={pref.areaMemo || ""}
              onChange={(e) => {
                if (isReadOnly) return;
                setEditForm({ ...editForm!, areaMemo: e.target.value });
              }}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* 賃料 */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-yen-sign"></i> 賃料設定
          </div>
          <div className={styles.formContent}>
            <div className={styles.selectRange}>
              <select
                className={styles.appSelect}
                value={pref.rentMin}
                onChange={(e) => {
                  if (isReadOnly) return;
                  setEditForm({ ...editForm!, rentMin: Number(e.target.value) });
                }}
                disabled={isReadOnly}
              >
                <option value={0}>下限なし</option>
                {RENT_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}万円以上
                  </option>
                ))}
              </select>
              <span className={styles.rangeSep}>〜</span>
              <select
                className={styles.appSelect}
                value={pref.rentMax}
                onChange={(e) => {
                  if (isReadOnly) return;
                  setEditForm({ ...editForm!, rentMax: Number(e.target.value) });
                }}
                disabled={isReadOnly}
              >
                {RENT_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}万円以下
                  </option>
                ))}
                <option value={999}>上限なし</option>
              </select>
            </div>

            <div className={styles.prioritySelectGroup}>
              <div className={styles.prioritySelectRow}>
                <span className={styles.priorityLabel}>管理費・共益費込み</span>
                <select
                  className={styles.preferenceSelect}
                  value={Number(pref.includeCommonFee || 0)}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setEditForm({ ...editForm!, includeCommonFee: Number(e.target.value) });
                  }}
                  disabled={isReadOnly}
                >
                  <option value={0}>こだわりなし</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      希望度 {num}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.prioritySelectRow}>
                <span className={styles.priorityLabel}>礼金なし</span>
                <select
                  className={styles.preferenceSelect}
                  value={Number(pref.noKeyMoney || 0)}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setEditForm({ ...editForm!, noKeyMoney: Number(e.target.value) });
                  }}
                  disabled={isReadOnly}
                >
                  <option value={0}>こだわりなし</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      希望度 {num}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.prioritySelectRow}>
                <span className={styles.priorityLabel}>敷金・保証金なし</span>
                <select
                  className={styles.preferenceSelect}
                  value={Number(pref.noDeposit || 0)}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setEditForm({ ...editForm!, noDeposit: Number(e.target.value) });
                  }}
                  disabled={isReadOnly}
                >
                  <option value={0}>こだわりなし</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      希望度 {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 間取り */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-vector-square"></i> 間取り選択
          </div>
          <div className={styles.checkboxGrid}>
            {ROOM_LAYOUTS.map((layout) => (
              <label key={layout} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={(pref.roomLayouts || []).includes(layout)}
                  onChange={() => {
                    if (isReadOnly) return;
                    const currentList = editForm!.roomLayouts || [];
                    const newList = currentList.includes(layout)
                      ? currentList.filter((item) => item !== layout)
                      : [...currentList, layout];
                    setEditForm({ ...editForm!, roomLayouts: newList });
                  }}
                  disabled={isReadOnly}
                />
                {layout}
              </label>
            ))}
          </div>
        </div>

        {/* 建物種別・構造 */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-building"></i> 建物種別＆構造
          </div>
          <div className={styles.formContent}>
            <span className={styles.subFormLabel}>建物種別</span>
            <div className={styles.checkboxGrid}>
              {BUILDING_TYPES.map((type) => (
                <label key={type} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={(pref.buildingTypes || []).includes(type)}
                    onChange={() => {
                      if (isReadOnly) return;
                      const currentList = editForm!.buildingTypes || [];
                      const newList = currentList.includes(type)
                        ? currentList.filter((item) => item !== type)
                        : [...currentList, type];
                      setEditForm({ ...editForm!, buildingTypes: newList });
                    }}
                    disabled={isReadOnly}
                  />
                  {type}
                </label>
              ))}
            </div>

            <span className={styles.subFormLabel} style={{ marginTop: "15px" }}>
              構造
            </span>
            <div className={styles.checkboxGrid}>
              {STRUCTURES.map((str) => (
                <label key={str} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={(pref.structures || []).includes(str)}
                    onChange={() => {
                      if (isReadOnly) return;
                      const currentList = editForm!.structures || [];
                      const newList = currentList.includes(str)
                        ? currentList.filter((item) => item !== str)
                        : [...currentList, str];
                      setEditForm({ ...editForm!, structures: newList });
                    }}
                    disabled={isReadOnly}
                  />
                  {str}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 駅徒歩・面積・築年数 */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-route"></i> 基本スペック (駅徒歩・面積・築年数)
          </div>
          <div className={styles.formContent} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label className={styles.selectLabel}>駅徒歩</label>
              <select
                className={styles.appSelect}
                value={pref.stationWalkMin}
                onChange={(e) => {
                  if (isReadOnly) return;
                  setEditForm({ ...editForm!, stationWalkMin: Number(e.target.value) });
                }}
                disabled={isReadOnly}
              >
                <option value={999}>指定なし</option>
                <option value={1}>1分以内</option>
                <option value={5}>5分以内</option>
                <option value={7}>7分以内</option>
                <option value={10}>10分以内</option>
                <option value={15}>15分以内</option>
                <option value={20}>20分以内</option>
              </select>
            </div>

            <div>
              <label className={styles.selectLabel}>専有面積</label>
              <div className={styles.selectRange}>
                <select
                  className={styles.appSelect}
                  value={pref.areaMin}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setEditForm({ ...editForm!, areaMin: Number(e.target.value) });
                  }}
                  disabled={isReadOnly}
                >
                  <option value={0}>下限なし</option>
                  {[20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}㎡以上
                    </option>
                  ))}
                </select>
                <span className={styles.rangeSep}>〜</span>
                <select
                  className={styles.appSelect}
                  value={pref.areaMax}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setEditForm({ ...editForm!, areaMax: Number(e.target.value) });
                  }}
                  disabled={isReadOnly}
                >
                  {[20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}㎡以下
                    </option>
                  ))}
                  <option value={999}>上限なし</option>
                </select>
              </div>
            </div>

            <div>
              <label className={styles.selectLabel}>築年数</label>
              <select
                className={styles.appSelect}
                value={pref.buildingAgeMax}
                onChange={(e) => {
                  if (isReadOnly) return;
                  setEditForm({ ...editForm!, buildingAgeMax: Number(e.target.value) });
                }}
                disabled={isReadOnly}
              >
                <option value={999}>指定なし</option>
                <option value={0}>新築</option>
                <option value={3}>3年以内</option>
                <option value={5}>5年以内</option>
                <option value={10}>10年以内</option>
                <option value={15}>15年以内</option>
                <option value={20}>20年以内</option>
                <option value={30}>30年以内</option>
              </select>
            </div>
          </div>
        </div>

        {/* 方位 */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-compass"></i> 希望方位
          </div>
          <div className={styles.checkboxGrid}>
            {DIRECTIONS.map((dir) => (
              <label key={dir} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={(pref.directions || []).includes(dir)}
                  onChange={() => {
                    if (isReadOnly) return;
                    const currentList = editForm!.directions || [];
                    const newList = currentList.includes(dir)
                      ? currentList.filter((item) => item !== dir)
                      : [...currentList, dir];
                    setEditForm({ ...editForm!, directions: newList });
                  }}
                  disabled={isReadOnly}
                />
                {dir}
              </label>
            ))}
          </div>
        </div>

        {/* こだわり設備 */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <i className="fa-solid fa-screwdriver-wrench"></i> こだわり設備
          </div>
          <div className={styles.preferenceSections}>
            {[
              "表示情報",
              "位置",
              "キッチン",
              "バス・トイレ",
              "テレビ・通信",
              "室内設備",
              "冷暖房",
              "収納",
              "セキュリティ",
              "建物設備",
              "その他",
              "入居条件",
              "お得条件",
            ].map((category) => (
              <div key={category} className={styles.prefCategoryBlock}>
                <span className={styles.subFormLabel}>{category}</span>
                <div className={styles.checkboxGrid}>
                  {PREFERENCE_ITEMS.filter((item) => item.category === category).map((item) => (
                    <div key={item.key} className={styles.preferenceItem}>
                      <span className={styles.preferenceLabel}>{item.label}</span>
                      <select
                        className={styles.preferenceSelect}
                        value={Number(pref[item.key as keyof PropertyPreference] || 0)}
                        onChange={(e) => {
                          if (isReadOnly) return;
                          setEditForm({ ...editForm!, [item.key]: Number(e.target.value) });
                        }}
                        disabled={isReadOnly}
                      >
                        <option value={0}>こだわりなし</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            希望度 {num}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 保存ボタン */}
        {!isReadOnly && (
          <button className={styles.saveBtn} onClick={handleSave}>
            <i className="fa-solid fa-floppy-disk"></i> この条件で保存する
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="card-title-main">
        <i className="fa-solid fa-house-chimney-window"></i> 理想の物件
      </div>

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === "settings" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <i className="fa-solid fa-sliders"></i> 自分の希望を設定
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "partner" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("partner")}
          disabled={!partnerUser}
        >
          <i className="fa-solid fa-user-friends"></i> {partnerName}の希望
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "compare" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("compare")}
        >
          <i className="fa-solid fa-code-compare"></i> お互い
        </button>
      </div>

      {activeTab === "compare" && (
        <div className={styles.compareContainer}>
          {/* パートナー設定なしの警告 */}
          {!partnerPreference && partnerUser && (
            <div className={styles.infoAlert}>
              <i className="fa-solid fa-circle-info"></i> {partnerName}の希望条件はまだ設定されていません。すり合わせの準備ができたら設定してみましょう！
            </div>
          )}
          {!partnerUser && (
            <div className={styles.infoAlert}>
              <i className="fa-solid fa-circle-info"></i> パートナー登録を行うと、お互いの希望条件をこちらで自動的に比較・すり合わせできます。
            </div>
          )}

          {/* サマリーカード */}
          {partnerPreference && (
            <div className={styles.summaryCard}>
              <div className={styles.summaryTitle}>
                <i className="fa-solid fa-handshake"></i> すり合わせの要約
              </div>
              <div className={styles.summaryContent}>
                <div className={styles.summaryItem}>
                  <strong>家賃の合意範囲:</strong>
                  <span className={rentAgreement?.isMatch ? styles.matchText : styles.warnText}>
                    {rentAgreement ? rentAgreement.text : "未設定"}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>駅徒歩の合意:</strong>
                  <span className={styles.matchText}>{walkAgreement ? walkAgreement.text : "未設定"}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>専有面積の合意:</strong>
                  <span className={styles.matchText}>{areaAgreement ? areaAgreement.text : "未設定"}</span>
                </div>
                <div className={styles.summaryItem}>
                  <strong>築年数の合意:</strong>
                  <span className={styles.matchText}>{ageAgreement ? ageAgreement.text : "未設定"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 希望エリアメモの比較 */}
          <div className={styles.compareCard}>
            <div className={styles.cardHeader}>
              <i className="fa-solid fa-map-location-dot"></i> 希望エリア
            </div>
            <div className={styles.memoCompareGrid}>
              <div className={styles.memoColumn}>
                <span className={styles.userNameBadgeMe}>{myName}</span>
                <p className={styles.memoText}>{myPreference.areaMemo || <span className={styles.emptyText}>未入力</span>}</p>
              </div>
              <div className={styles.memoColumn}>
                <span className={styles.userNameBadgePartner}>{partnerName}</span>
                <p className={styles.memoText}>
                  {partnerPreference?.areaMemo || <span className={styles.emptyText}>未入力</span>}
                </p>
              </div>
            </div>
          </div>

          {/* 家賃の比較 */}
          <div className={styles.compareCard}>
            <div className={styles.cardHeader}>
              <i className="fa-solid fa-yen-sign"></i> 賃料条件
            </div>
            <div className={styles.compareGrid}>
              <div className={styles.compareCol}>
                <span className={styles.userNameBadgeMe}>{myName}</span>
                <div className={styles.valueText}>
                  {getRentRangeText(myPreference.rentMin, myPreference.rentMax, myPreference.includeCommonFee)}
                  <div className={styles.subCheckList}>
                    {myPreference.noKeyMoney > 0 && <span>礼金なし (希望度: {myPreference.noKeyMoney})</span>}
                    {myPreference.noDeposit > 0 && <span>敷金なし (希望度: {myPreference.noDeposit})</span>}
                  </div>
                </div>
              </div>
              <div className={styles.compareCol}>
                <span className={styles.userNameBadgePartner}>{partnerName}</span>
                <div className={styles.valueText}>
                  {partnerPreference
                    ? getRentRangeText(
                      partnerPreference.rentMin,
                      partnerPreference.rentMax,
                      partnerPreference.includeCommonFee
                    )
                    : "未設定"}
                  <div className={styles.subCheckList}>
                    {partnerPreference && partnerPreference.noKeyMoney > 0 && <span>礼金なし (希望度: {partnerPreference.noKeyMoney})</span>}
                    {partnerPreference && partnerPreference.noDeposit > 0 && <span>敷金なし (希望度: {partnerPreference.noDeposit})</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 間取りの比較 */}
          {(() => {
            const { common, onlyMe, onlyPartner } = getArrayComparison("roomLayouts");
            return (
              <div className={styles.compareCard}>
                <div className={styles.cardHeader}>
                  <i className="fa-solid fa-vector-square"></i> 希望の間取り
                </div>
                <div className={styles.tagComparisonContainer}>
                  {common.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelCommon}>❤️ お互いに希望</span>
                      <div className={styles.tagWrapper}>
                        {common.map((x) => (
                          <span key={x} className={styles.tagCommon}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onlyMe.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelMe}>👤 {myName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyMe.map((x) => (
                          <span key={x} className={styles.tagMe}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {partnerPreference && onlyPartner.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelPartner}>👥 {partnerName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyPartner.map((x) => (
                          <span key={x} className={styles.tagPartner}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {common.length === 0 && onlyMe.length === 0 && (!partnerPreference || onlyPartner.length === 0) && (
                    <div className={styles.emptyText}>お互いに間取りを設定していません。</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 建物種別 */}
          {(() => {
            const { common, onlyMe, onlyPartner } = getArrayComparison("buildingTypes");
            return (
              <div className={styles.compareCard}>
                <div className={styles.cardHeader}>
                  <i className="fa-solid fa-building"></i> 建物種別
                </div>
                <div className={styles.tagComparisonContainer}>
                  {common.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelCommon}>❤️ お互いに希望</span>
                      <div className={styles.tagWrapper}>
                        {common.map((x) => (
                          <span key={x} className={styles.tagCommon}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onlyMe.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelMe}>👤 {myName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyMe.map((x) => (
                          <span key={x} className={styles.tagMe}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {partnerPreference && onlyPartner.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelPartner}>👥 {partnerName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyPartner.map((x) => (
                          <span key={x} className={styles.tagPartner}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 希望の構造 */}
          {(() => {
            const { common, onlyMe, onlyPartner } = getArrayComparison("structures");
            return (
              <div className={styles.compareCard}>
                <div className={styles.cardHeader}>
                  <i className="fa-solid fa-cubes"></i> 希望の構造
                </div>
                <div className={styles.tagComparisonContainer}>
                  {common.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelCommon}>❤️ お互いに希望</span>
                      <div className={styles.tagWrapper}>
                        {common.map((x) => (
                          <span key={x} className={styles.tagCommon}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onlyMe.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelMe}>👤 {myName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyMe.map((x) => (
                          <span key={x} className={styles.tagMe}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {partnerPreference && onlyPartner.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelPartner}>👥 {partnerName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyPartner.map((x) => (
                          <span key={x} className={styles.tagPartner}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {common.length === 0 && onlyMe.length === 0 && (!partnerPreference || onlyPartner.length === 0) && (
                    <div className={styles.emptyText}>お互いに構造を設定していません。</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 希望方位 */}
          {(() => {
            const { common, onlyMe, onlyPartner } = getArrayComparison("directions");
            return (
              <div className={styles.compareCard}>
                <div className={styles.cardHeader}>
                  <i className="fa-solid fa-compass"></i> 希望方位
                </div>
                <div className={styles.tagComparisonContainer}>
                  {common.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelCommon}>❤️ お互いに希望</span>
                      <div className={styles.tagWrapper}>
                        {common.map((x) => (
                          <span key={x} className={styles.tagCommon}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onlyMe.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelMe}>👤 {myName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyMe.map((x) => (
                          <span key={x} className={styles.tagMe}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {partnerPreference && onlyPartner.length > 0 && (
                    <div className={styles.tagGroup}>
                      <span className={styles.tagLabelPartner}>👥 {partnerName}の希望</span>
                      <div className={styles.tagWrapper}>
                        {onlyPartner.map((x) => (
                          <span key={x} className={styles.tagPartner}>{x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {common.length === 0 && onlyMe.length === 0 && (!partnerPreference || onlyPartner.length === 0) && (
                    <div className={styles.emptyText}>お互いに希望方位を設定していません。</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* こだわり設備の一致状況 */}
          <div className={styles.compareCard}>
            <div className={styles.cardHeader}>
              <i className="fa-solid fa-sparkles"></i> こだわり設備の一致状況
            </div>
            <div className={styles.preferenceCompareList}>
              {PREFERENCE_ITEMS.map((item) => {
                const myVal = Number(myPreference[item.key as keyof PropertyPreference] || 0);
                const pVal = partnerPreference ? Number(partnerPreference[item.key as keyof PropertyPreference] || 0) : 0;
 
                let matchStatus: "both" | "meOnly" | "partnerOnly" | "none" = "none";
                if (myVal > 0 && pVal > 0) matchStatus = "both";
                else if (myVal > 0) matchStatus = "meOnly";
                else if (pVal > 0) matchStatus = "partnerOnly";
 
                if (matchStatus === "none") return null;
 
                return (
                  <div key={item.key} className={styles.prefCompareRow}>
                    <div className={styles.prefCompareLabel}>
                      <span className={styles.categoryBadge}>{item.category}</span>
                      <span className={styles.prefLabelName}>{item.label}</span>
                    </div>
                    <div className={styles.prefCompareStatus}>
                      {matchStatus === "both" && (
                        <span className={styles.badgeBoth}>❤️ 両方希望 (自分: {myVal}, 相手: {pVal})</span>
                      )}
                      {matchStatus === "meOnly" && (
                        <span className={styles.badgeMeOnly}>{myName}希望 (希望度: {myVal})</span>
                      )}
                      {matchStatus === "partnerOnly" && (
                        <span className={styles.badgePartnerOnly}>{partnerName}希望 (希望度: {pVal})</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* どちらもこだわり条件を何も選んでいない場合 */}
              {PREFERENCE_ITEMS.every(
                (item) =>
                  Number(myPreference[item.key as keyof PropertyPreference] || 0) === 0 &&
                  (!partnerPreference || Number(partnerPreference[item.key as keyof PropertyPreference] || 0) === 0)
              ) && <div className={styles.emptyText}>こだわり条件は現在お互いに選んでいません。</div>}
            </div>
          </div>


          {/* ベン図でお互いの基本条件を可視化 */}
          {partnerPreference && (
            (() => {
              const { common, onlyMe, onlyPartner } = getBasicSpecsComparison();

              return (
                <div className={styles.vennWrapper} style={{ marginBottom: "24px" }}>
                  <div className={styles.vennHeader}>
                    <i className="fa-solid fa-house-laptop"></i> お互いの基本条件重なり（ベン図）
                  </div>
                  
                  <div className={styles.vennDiagram}>
                    {/* 左円: 自分のみ */}
                    <div className={`${styles.vennCircle} ${styles.vennLeft}`}>
                      <span className={styles.vennLabel}>{myName}のみ</span>
                      <span className={styles.vennCount}>{onlyMe.length}件</span>
                    </div>
                    
                    {/* 右円: パートナーのみ */}
                    <div className={`${styles.vennCircle} ${styles.vennRight}`}>
                      <span className={styles.vennLabel}>{partnerName}のみ</span>
                      <span className={styles.vennCount}>{onlyPartner.length}件</span>
                    </div>
                    
                    {/* 重なり部分 */}
                    <div className={styles.vennIntersection}>
                      <span className={styles.vennLabel}>❤️ 一致</span>
                      <span className={styles.vennCount}>{common.length}件</span>
                    </div>
                  </div>

                  {/* 詳細タグリスト */}
                  <div className={styles.vennDetails}>
                    {common.length > 0 && (
                      <div className={styles.vennDetailGroup}>
                        <div className={`${styles.vennDetailTitle} ${styles.titleCommon}`}>
                          <i className="fa-solid fa-heart"></i> お互いに一致・合意する基本条件 ({common.length})
                        </div>
                        <div className={styles.vennTags}>
                          {common.map((tag, idx) => (
                            <span key={idx} className={`${styles.vennTag} ${styles.tagCommon}`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {onlyMe.length > 0 && (
                      <div className={styles.vennDetailGroup}>
                        <div className={`${styles.vennDetailTitle} ${styles.titleMe}`}>
                          <i className="fa-solid fa-user"></i> {myName}だけが指定する基本条件 ({onlyMe.length})
                        </div>
                        <div className={styles.vennTags}>
                          {onlyMe.map((tag, idx) => (
                            <span key={idx} className={`${styles.vennTag} ${styles.tagMe}`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {onlyPartner.length > 0 && (
                      <div className={styles.vennDetailGroup}>
                        <div className={`${styles.vennDetailTitle} ${styles.titlePartner}`}>
                          <i className="fa-solid fa-user-friends"></i> {partnerName}だけが指定する基本条件 ({onlyPartner.length})
                        </div>
                        <div className={styles.vennTags}>
                          {onlyPartner.map((tag, idx) => (
                            <span key={idx} className={`${styles.vennTag} ${styles.tagPartner}`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* ベン図でお互いのこだわり条件を可視化 */}
          {partnerPreference && (
            (() => {
              const commonPrefs = PREFERENCE_ITEMS.filter(item => 
                Number(myPreference[item.key as keyof PropertyPreference] || 0) > 0 && 
                Number(partnerPreference ? partnerPreference[item.key as keyof PropertyPreference] || 0 : 0) > 0
              );
              const onlyMePrefs = PREFERENCE_ITEMS.filter(item => 
                Number(myPreference[item.key as keyof PropertyPreference] || 0) > 0 && 
                Number(partnerPreference ? partnerPreference[item.key as keyof PropertyPreference] || 0 : 0) === 0
              );
              const onlyPartnerPrefs = PREFERENCE_ITEMS.filter(item => 
                Number(myPreference[item.key as keyof PropertyPreference] || 0) === 0 && 
                Number(partnerPreference ? partnerPreference[item.key as keyof PropertyPreference] || 0 : 0) > 0
              );

              return (
                <div className={styles.vennWrapper}>
                  <div className={styles.vennHeader}>
                    <i className="fa-solid fa-diagram-project"></i> お互いのこだわり重なり（ベン図）
                  </div>
                  
                  <div className={styles.vennDiagram}>
                    {/* 左円: 自分のみ */}
                    <div className={`${styles.vennCircle} ${styles.vennLeft}`}>
                      <span className={styles.vennLabel}>{myName}のみ</span>
                      <span className={styles.vennCount}>{onlyMePrefs.length}件</span>
                    </div>
                    
                    {/* 右円: パートナーのみ */}
                    <div className={`${styles.vennCircle} ${styles.vennRight}`}>
                      <span className={styles.vennLabel}>{partnerName}のみ</span>
                      <span className={styles.vennCount}>{onlyPartnerPrefs.length}件</span>
                    </div>
                    
                    {/* 重なり部分 */}
                    <div className={styles.vennIntersection}>
                      <span className={styles.vennLabel}>❤️ 一致</span>
                      <span className={styles.vennCount}>{commonPrefs.length}件</span>
                    </div>
                  </div>

                  {/* 詳細タグリスト */}
                  <div className={styles.vennDetails}>
                    {commonPrefs.length > 0 && (
                      <div className={styles.vennDetailGroup}>
                        <div className={`${styles.vennDetailTitle} ${styles.titleCommon}`}>
                          <i className="fa-solid fa-heart"></i> お互いに希望する条件 ({commonPrefs.length})
                        </div>
                        <div className={styles.vennTags}>
                          {commonPrefs.map(item => (
                            <span key={item.key} className={`${styles.vennTag} ${styles.tagCommon}`}>
                              {item.label} (自分: {myPreference[item.key as keyof PropertyPreference]}, 相手: {partnerPreference ? partnerPreference[item.key as keyof PropertyPreference] : 0})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {onlyMePrefs.length > 0 && (
                      <div className={styles.vennDetailGroup}>
                        <div className={`${styles.vennDetailTitle} ${styles.titleMe}`}>
                          <i className="fa-solid fa-user"></i> {myName}だけが希望する条件 ({onlyMePrefs.length})
                        </div>
                        <div className={styles.vennTags}>
                          {onlyMePrefs.map(item => (
                            <span key={item.key} className={`${styles.vennTag} ${styles.tagMe}`}>
                              {item.label} (希望度: {myPreference[item.key as keyof PropertyPreference]})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {onlyPartnerPrefs.length > 0 && (
                      <div className={styles.vennDetailGroup}>
                        <div className={`${styles.vennDetailTitle} ${styles.titlePartner}`}>
                          <i className="fa-solid fa-user-friends"></i> {partnerName}だけが希望する条件 ({onlyPartnerPrefs.length})
                        </div>
                        <div className={styles.vennTags}>
                          {onlyPartnerPrefs.map(item => (
                            <span key={item.key} className={`${styles.vennTag} ${styles.tagPartner}`}>
                              {item.label} (希望度: {partnerPreference ? partnerPreference[item.key as keyof PropertyPreference] : 0})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {activeTab === "settings" && editForm && renderForm(editForm, false)}

      {activeTab === "partner" && (
        partnerPreference ? (
          renderForm(partnerPreference, true)
        ) : (
          <div className={styles.infoAlert}>
            <i className="fa-solid fa-circle-info"></i> {partnerName}の希望条件はまだ設定されていません。すり合わせの準備ができたら設定してもらいましょう！🌱
          </div>
        )
      )}

      <BackToHome />
    </div>
  );
}
