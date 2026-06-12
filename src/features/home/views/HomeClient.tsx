"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getWishlist } from "@/src/features/wishlist/api/wishlist-client-service";
import { getPartnerData, updateProfile } from "@/src/features/user/api/user-client-service";
import { getDailyStatuses, saveDailyStatus } from "@/src/features/home/api/daily-status-client-service";
import { getEvents, getTodosForCalendar } from "@/src/features/calendar/api/calendar-client-service";
import { getGroups } from "@/src/features/todo/api/todo-client-service";
import { getAnniversaries } from "@/src/features/anniversary/api/anniversary-client-service";
import { Wishlist, User as FirestoreUser, DailyStatus, CalendarEvent, Group, Anniversary, Todo } from "@/src/lib/firestore/types";
import { getNextAnniversaryDiff } from "@/src/lib/functions";
import styles from "./Home.module.css";
import ProfileModal from "../components/ProfileModal";
import CalendarView from "@/src/features/calendar/components/CalendarView";
import DailyStatusCard from "../components/DailyStatusCard";
import DailyStatusModal from "../components/DailyStatusModal";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import GoalModal from "../components/GoalModal";

const CLOCK_THEMES = [
  "themePinkyRibbon",
  "themeMintyBubble",
  "themeMilkyStar",
  "themeSunnyCitrus",
  "themeCottonCandy",
  "themeClassicPastel",
  "themeMacaronClock",
  "themeBerryPie",
  "themeOceanPearl",
  "themeNightOwl",
  "themeRainbowPop",
  "themeNeonCyber",
  "themeMatchaLatte",
  "themeSweetDonut",
  "themeGalaxyMagic",
];

export default function HomeClient() {
  const { user, userData, refreshUserData } = useAuth();
  const searchParams = useSearchParams();
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const [recentWishlist, setRecentWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  const [activeProfileModal, setActiveProfileModal] = useState<'partner' | 'me' | null>(null);
  const [myDailyStatus, setMyDailyStatus] = useState<DailyStatus | null>(null);
  const [partnerDailyStatus, setPartnerDailyStatus] = useState<DailyStatus | null>(null);
  const [isDailyStatusModalOpen, setIsDailyStatusModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isGoalSubmitting, setIsGoalSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("action") === "status") {
      setIsDailyStatusModalOpen(true);
    }
  }, [searchParams]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<Anniversary[]>([]);
  const [upcomingTodos, setUpcomingTodos] = useState<Todo[]>([]);
  const [wishlistGroups, setWishlistGroups] = useState<Group[]>([]);
  const [openCalendarDate, setOpenCalendarDate] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("themePinkyRibbon");
  const [clockType, setClockType] = useState<"digital" | "analog">("digital");

  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  useEffect(() => {
    // ログイン直後の演出用
    const hasWelcomed = sessionStorage.getItem('candy.welcomed');
    if (!hasWelcomed && userData?.nickname) {
      setShowWelcome(true);
      sessionStorage.setItem('candy.welcomed', 'true');
      setTimeout(() => setShowWelcome(false), 3500);
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.clockTheme) {
      setCurrentTheme(userData.clockTheme);
    }
    if (userData?.clockType) {
      setClockType(userData.clockType);
    }
  }, [userData]);

  useEffect(() => {
    // 全ての必須項目が揃っている場合のみデータ取得
    const hasRequired =
      userData?.nickname &&
      userData?.mbti &&
      userData?.birthday &&
      userData?.phone &&
      userData?.emergencyContact &&
      userData?.allergies &&
      userData?.medications &&
      userData?.medicalHistory &&
      userData?.dislikedFoods &&
      userData?.favoriteFoods &&
      userData?.happyThings &&
      userData?.dislikedThings;

    if (user && hasRequired) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      Promise.all([
        getWishlist(),
        getPartnerData(user.uid),
        getDailyStatuses(todayStr),
        getEvents(),
        getGroups("wishlist"),
        getAnniversaries(user.uid, userData?.partnerUid || null),
        getTodosForCalendar()
      ]).then(([wishData, partner, statuses, allEvents, groups, anniversaries, allTodos]) => {
        // 自分とパートナー、それぞれのWishlistを新しい順に最大3件ずつ取得
        const myWishes = wishData
          .filter(w => w.uid === user.uid)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 3);
        const partnerWishes = wishData
          .filter(w => w.uid !== user.uid)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 3);
        setRecentWishlist([...myWishes, ...partnerWishes]);
        setPartnerData(partner);

        const myStatus = statuses.find(s => s.uid === user.uid) || null;
        const pStatus = statuses.find(s => s.uid !== user.uid) || null;
        setMyDailyStatus(myStatus);
        setPartnerDailyStatus(pStatus);

        const currentHourMin = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

        const validEvents = allEvents.filter(e => {
          if (e.endDate < todayStr) return false;
          if (e.endDate === todayStr && !e.isAllDay && e.endTime) {
            if (e.endTime < currentHourMin) return false;
          }
          // 相手のみのイベントを除外（自分または2人のみ表示）
          if (e.type !== "couple" && e.uid !== user.uid) return false;

          return true;
        });

        validEvents.sort((a, b) => {
          if (a.isAllDay && !b.isAllDay) return 1;
          if (!a.isAllDay && b.isAllDay) return -1;

          if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);

          if (a.startTime && b.startTime) {
            return a.startTime.localeCompare(b.startTime);
          }
          return 0;
        });

        // 予定：最大3件
        setUpcomingEvents(validEvents.slice(0, 3));
        setWishlistGroups(groups);
        
        // 記念日のソート（直近のもの3件）
        const sortedAnniversaries = [...anniversaries].sort((a, b) => {
          return getNextAnniversaryDiff(a.date).diffDays - getNextAnniversaryDiff(b.date).diffDays;
        });
        setUpcomingAnniversaries(sortedAnniversaries.slice(0, 3));

        // TODOのフィルタとソート（日付設定されている未完了TODO3件）
        const validTodos = allTodos.filter(t => {
          if (t.isCompleted) return false;
          if (!t.date) return false;
          if (t.type !== "couple" && t.uid !== user.uid) return false;
          return true;
        });

        validTodos.sort((a, b) => {
          return a.date!.localeCompare(b.date!);
        });

        setUpcomingTodos(validTodos.slice(0, 3));

        setLoading(false);
      });
    }
  }, [user, userData]);

  const handleSaveDailyStatus = async (data: Partial<DailyStatus>) => {
    setIsStatusSubmitting(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const submitData: any = {
        ...data,
        uid: user?.uid,
        date: todayStr,
      };
      if (myDailyStatus?.id) {
        submitData.id = myDailyStatus.id;
      }

      const docRef = await saveDailyStatus(submitData);
      setMyDailyStatus({ ...myDailyStatus, ...submitData, id: docRef.id } as DailyStatus);
      setIsDailyStatusModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const handleSaveGoal = async (goal: string) => {
    if (!user) return;
    setIsGoalSubmitting(true);
    try {
      await updateProfile(user.uid, { goal });
      await refreshUserData();
      setIsGoalModalOpen(false);
    } catch (e) {
      console.error("Failed to save goal:", e);
    } finally {
      setIsGoalSubmitting(false);
    }
  };

  const handleSavePartnerComment = async (comment: string) => {
    if (!partnerDailyStatus?.id) return;
    try {
      const submitData = {
        id: partnerDailyStatus.id,
        partnerComment: comment,
      };
      await saveDailyStatus(submitData);
      setPartnerDailyStatus({
        ...partnerDailyStatus,
        partnerComment: comment,
      });
    } catch (e) {
      console.error("Failed to save partner comment", e);
    }
  };

  const handleStatusUpdate = (updated: DailyStatus) => {
    if (updated.uid === user?.uid) {
      setMyDailyStatus(updated);
    } else {
      setPartnerDailyStatus(updated);
    }
  };

  const handleCycleTheme = async () => {
    const currentIndex = CLOCK_THEMES.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % CLOCK_THEMES.length;
    const nextThemeId = CLOCK_THEMES[nextIndex];
    setCurrentTheme(nextThemeId);

    if (user) {
      try {
        await updateProfile(user.uid, { clockTheme: nextThemeId });
      } catch (e) {
        console.error("Failed to save clock theme", e);
      }
    }
  };

  const handleToggleType = async () => {
    const nextType = clockType === "digital" ? "analog" : "digital";
    setClockType(nextType);

    if (user) {
      try {
        await updateProfile(user.uid, { clockType: nextType });
      } catch (e) {
        console.error("Failed to save clock type", e);
      }
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDate = (date: Date) => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const day = days[date.getDay()];
    return `${m}月${d}日 (${day})`;
  };


  return (
    <AuthGuard>
      <div className={`page-container ${styles.homeContainer}`}>
        {activeProfileModal === 'partner' && (
          <ProfileModal
            userData={partnerData}
            title="のプロフィール"
            onClose={() => setActiveProfileModal(null)}
          />
        )}
        {activeProfileModal === 'me' && (
          <ProfileModal
            userData={userData as FirestoreUser}
            title="のプロフィール"
            isMe={true}
            onClose={() => setActiveProfileModal(null)}
          />
        )}

        {showWelcome && (
          <div className={styles.welcomeOverlay}>
            <div className={styles.welcomeCandy}>🍭</div>
            <div className={styles.welcomeText}>
              Welcome Back,
              <span className={styles.welcomeName}>{userData?.nickname}</span>
            </div>
          </div>
        )}

        <div className={`${styles.cuteClockContainer} ${styles[currentTheme]}`}>
          <div className={styles.clockControls}>
            <button className={styles.cycleThemeBtn} onClick={handleCycleTheme} title="テーマを変更">
              <i className="fa-solid fa-palette"></i>
            </button>
            <button className={styles.cycleThemeBtn} onClick={handleToggleType} title="デジタル/アナログ切替">
              <i className="fa-solid fa-clock"></i>
            </button>
          </div>

          {clockType === "digital" ? (
            <>
              <div className={styles.cuteDate}>{formatDate(currentTime)}</div>
              <div className={styles.cuteTime}>{formatTime(currentTime)}</div>
            </>
          ) : (
            <div className={styles.analogClock}>
              <div className={styles.analogFace}>
                {[...Array(12)].map((_, i) => {
                  const num = i + 1;
                  const angle = num * 30;
                  return (
                    <div
                      key={num}
                      className={styles.clockNumberContainer}
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <div
                        className={styles.clockNumber}
                        style={{ transform: `rotate(${-angle}deg)` }}
                      >
                        {num}
                      </div>
                    </div>
                  );
                })}
                <div
                  className={styles.analogHour}
                  style={{ transform: `rotate(${(currentTime.getHours() % 12) * 30 + currentTime.getMinutes() * 0.5}deg)` }}
                />
                <div
                  className={styles.analogMinute}
                  style={{ transform: `rotate(${currentTime.getMinutes() * 6 + currentTime.getSeconds() * 0.1}deg)` }}
                />
                <div
                  className={styles.analogSecond}
                  style={{ transform: `rotate(${currentTime.getSeconds() * 6}deg)` }}
                />
                <div className={styles.analogCenter} />
              </div>
              <div className={styles.cuteDateAnalog}>{formatDate(currentTime)}</div>
            </div>
          )}
        </div>

        <div className={styles.welcomeSection}>
          <div className={styles.profileRow}>
            {/* My profile */}
            <div className={styles.profileImgContainer}>
              <img src={userData?.pictureUrl || "/icon.png"} alt="Profile" className={styles.profileImg} />
              <Link href="/user/edit" className={styles.editBadge}>
                <i className="fa-solid fa-pen"></i>
              </Link>
            </div>

            {/* Heart connector */}
            <div className={styles.heartConnector}>
              <i className="fa-solid fa-heart"></i>
            </div>

            {/* Partner profile */}
            <div className={styles.profileImgContainer}>
              <img src={partnerData?.pictureUrl || "/icon.png"} alt="Partner Profile" className={`${styles.profileImg} ${styles.partnerImg}`} />
            </div>
          </div>
          <div className={styles.greeting}>
            Hi, <span className={styles.nickname}>{userData?.nickname || userData?.displayName}</span> &{" "}
            <span className={styles.partnerNickname}>{partnerData?.nickname || "パートナー"}</span>! 🍭
          </div>

          <div className={styles.goalSection}>
            <div className={styles.goalCard} onClick={() => setIsGoalModalOpen(true)} style={{ cursor: "pointer" }}>
              <div className={styles.goalTitle}>
                <i className="fa-solid fa-bullseye" style={{ color: "#F7A8C4" }}></i>
                <span>{userData?.nickname || userData?.displayName || "自分"}の目標</span>
                <button 
                  className={styles.editGoalBtn} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGoalModalOpen(true);
                  }}
                  title="目標を編集"
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                </button>
              </div>
              <div className={styles.goalText}>
                {userData?.goal ? (
                  userData.goal
                ) : (
                  <span className={styles.noGoal}>タップして目標を設定しましょう！</span>
                )}
              </div>
            </div>

            {partnerData && (
              <div className={styles.goalCard}>
                <div className={styles.goalTitle}>
                  <i className="fa-solid fa-bullseye" style={{ color: "#A0E7D2" }}></i>
                  <span>{partnerData.nickname || partnerData.displayName || "パートナー"}の目標</span>
                </div>
                <div className={styles.goalText}>
                  {partnerData.goal ? (
                    partnerData.goal
                  ) : (
                    <span className={styles.noGoal}>未設定</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <DailyStatusCard
            user={userData as FirestoreUser}
            status={myDailyStatus}
            isMe={true}
            currentUser={userData as FirestoreUser}
            partnerUser={partnerData}
            onEdit={() => setIsDailyStatusModalOpen(true)}
            onOpenHistory={() => router.push('/status-history')}
            onStatusUpdate={handleStatusUpdate}
          />
          <DailyStatusCard
            user={partnerData}
            status={partnerDailyStatus}
            isMe={false}
            currentUser={userData as FirestoreUser}
            partnerUser={partnerData}
            onOpenHistory={() => router.push('/status-history')}
            onSavePartnerComment={handleSavePartnerComment}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>

        {!loading && (upcomingEvents.length > 0 || upcomingTodos.length > 0) && (
          <div className={styles.notificationList} style={{ marginBottom: '24px' }}>
            {upcomingEvents.length > 0 && (
              <div className={styles.notificationGroup}>
                <div className={styles.notificationHeader}>
                  <i className={`fa-regular fa-calendar ${styles.notificationIcon}`} style={{ color: '#F7A8C4' }}></i>
                  <span className={styles.notificationText}>
                    直近のイベント
                  </span>
                </div>
                <div className={styles.notificationItems}>
                  {upcomingEvents.map(e => {
                    const [y, m, d] = e.startDate.split('-').map(Number);
                    const eventDateOnly = new Date(y, m - 1, d);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffTime = eventDateOnly.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    let countdownText = `あと${diffDays}日`;
                    if (diffDays === 0) countdownText = "🎉 本日！";
                    else if (diffDays === 1) countdownText = "✨ 明日！";

                    return (
                      <div key={e.id} className={styles.notificationSubItem} onClick={() => setOpenCalendarDate(e.startDate)} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>{y}.{String(m).padStart(2, '0')}.{String(d).padStart(2, '0')}</span>
                          <span className={styles.countdownBadge}>{countdownText}</span>
                        </div>
                        <span className={styles.notificationTitle}>{e.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {upcomingTodos.length > 0 && (
              <div className={styles.notificationGroup}>
                <div className={styles.notificationHeader}>
                  <i className={`fa-solid fa-list-check ${styles.notificationIcon}`} style={{ color: '#A0E7D2' }}></i>
                  <span className={styles.notificationText}>
                    直近のTODO
                  </span>
                </div>
                <div className={styles.notificationItems}>
                  {upcomingTodos.map(t => {
                    let badgeClass = styles.badgeCouple;
                    let typeLabel = "2人";
                    if (t.type !== 'couple') {
                      if (t.uid === user?.uid) {
                        badgeClass = styles.badgeMe;
                        typeLabel = userData?.nickname || "自分";
                      } else {
                        badgeClass = styles.badgePartner;
                        typeLabel = partnerData?.nickname || "パートナー";
                      }
                    }

                    const [y, m, d] = t.date!.split('-').map(Number);
                    const todoDateOnly = new Date(y, m - 1, d);
                    const todayVal = new Date();
                    todayVal.setHours(0, 0, 0, 0);
                    const diffTime = todoDateOnly.getTime() - todayVal.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    let countdownText = `あと${diffDays}日`;
                    let badgeStyle: React.CSSProperties = {};
                    if (diffDays === 0) {
                      countdownText = "🎉 本日！";
                    } else if (diffDays === 1) {
                      countdownText = "✨ 明日！";
                    } else if (diffDays < 0) {
                      countdownText = `⚠️ 遅延(${Math.abs(diffDays)}日)`;
                      badgeStyle = { background: '#ffebee', color: '#c62828', borderColor: '#c62828' };
                    }

                    return (
                      <Link href="/todo" key={t.id} className={styles.notificationSubItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={`${styles.badge} ${badgeClass}`}>{typeLabel}</span>
                          <span style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>{y}.{String(m).padStart(2, '0')}.{String(d).padStart(2, '0')}</span>
                          <span className={styles.countdownBadge} style={badgeStyle}>{countdownText}</span>
                        </div>
                        <span className={styles.notificationTitle}>{t.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {user && (
          <CalendarView
            currentUserId={user.uid}
            myNickname={userData?.nickname || userData?.displayName || "自分"}
            partnerNickname={partnerData?.nickname || "パートナー"}
            myPictureUrl={userData?.pictureUrl}
            partnerPictureUrl={partnerData?.pictureUrl}
            openDate={openCalendarDate}
            onOpenDateClear={() => setOpenCalendarDate(null)}
          />
        )}

        {!loading && (recentWishlist.length > 0 || upcomingAnniversaries.length > 0) && (
          <div className={styles.notificationList} style={{ marginTop: '24px', marginBottom: '24px' }}>
            {(() => {
              const grouped: { uid: string; creatorName: string; items: Wishlist[] }[] = [];
              let currentGroup: { uid: string; creatorName: string; items: Wishlist[] } | null = null;

              recentWishlist.forEach((w) => {
                if (!currentGroup || currentGroup.uid !== w.uid) {
                  if (currentGroup) grouped.push(currentGroup);
                  currentGroup = {
                    uid: w.uid,
                    creatorName: w.uid === user?.uid
                      ? (userData?.nickname || userData?.displayName || "自分")
                      : (partnerData?.nickname || "パートナー"),
                    items: [w]
                  };
                } else {
                  currentGroup.items.push(w);
                }
              });
              if (currentGroup) grouped.push(currentGroup);

              return grouped.map((group, idx) => (
                <div key={idx} className={styles.notificationGroup}>
                  <div className={styles.notificationHeader}>
                    <i className={`fa-solid fa-gift ${styles.notificationIcon}`}></i>
                    <span className={styles.notificationText}>
                      {group.creatorName}がWishlistを追加しました
                    </span>
                  </div>
                  <div className={styles.notificationItems}>
                    {group.items.map(item => {
                      const wGroup = wishlistGroups.find(g => g.id === item.groupId);
                      const groupName = wGroup ? wGroup.name : '未分類';

                      let badgeClass = styles.badgeCouple;
                      let typeLabel = "2人";
                      if (item.type !== 'couple') {
                        if (item.uid === user?.uid) {
                          badgeClass = styles.badgeMe;
                          typeLabel = "自分";
                        } else {
                          badgeClass = styles.badgePartner;
                          typeLabel = partnerData?.nickname || "パートナー";
                        }
                      }

                      return (
                        <Link href="/wishlist?sort=createdAt_desc&filter=all" key={item.id} className={styles.notificationSubItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#999', alignItems: 'center' }}>
                            <span className={`${styles.badge} ${badgeClass}`}>{typeLabel}</span>
                            <span style={{ fontWeight: 'bold' }}>{groupName}</span>
                          </div>
                          <span className={styles.notificationTitle}>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {upcomingAnniversaries.length > 0 && (
              <div className={styles.notificationGroup}>
                <div className={styles.notificationHeader}>
                  <i className={`fa-solid fa-cake-candles ${styles.notificationIcon}`} style={{ color: '#9B7CC3' }}></i>
                  <span className={styles.notificationText}>
                    もうすぐ記念日
                  </span>
                </div>
                <div className={styles.notificationItems}>
                  {upcomingAnniversaries.map(a => {
                    const { diffDays, isToday } = getNextAnniversaryDiff(a.date);
                    let countdownText = `あと${diffDays}日`;
                    if (isToday) countdownText = "🎉 今日です！";
                    else if (diffDays === 1) countdownText = "✨ 明日！";
                    
                    const displayDate = a.date.replace("-", "/"); // MM/DD

                    return (
                      <div key={a.id} className={styles.notificationSubItem} onClick={() => router.push('/anniversaries')} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>{displayDate}</span>
                          <span className={styles.countdownBadge} style={{ background: '#f3e5f5', color: '#9B7CC3' }}>{countdownText}</span>
                        </div>
                        <span className={styles.notificationTitle}>{a.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.menuGrid}>
          <Link href="/wishlist" className={`${styles.menuCard} ${styles.cardWish}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-gift"></i></span>
            <span className={styles.cardTitle}>Wishlist</span>
          </Link>
          <Link href="/todo" className={`${styles.menuCard} ${styles.cardTodo}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-list-check"></i></span>
            <span className={styles.cardTitle}>TODO</span>
          </Link>
          <Link href="/status-history" className={`${styles.menuCard} ${styles.cardHistory}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-clock-rotate-left"></i></span>
            <span className={styles.cardTitle}>過去の私たち</span>
          </Link>
          <Link href="/anniversaries" className={`${styles.menuCard} ${styles.cardAnniversary}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-cake-candles"></i></span>
            <span className={styles.cardTitle}>記念日</span>
          </Link>
        </div>
        <div className={styles.menuGrid}>
          <button className={`${styles.menuCard} ${styles.cardPartner}`} onClick={() => setActiveProfileModal('partner')}>
            <span className={styles.cardIcon}><i className="fa-solid fa-heart-pulse"></i></span>
            <span className={styles.cardTitle}>パートナーの情報を見る</span>
          </button>
          <button className={`${styles.menuCard} ${styles.cardMe}`} onClick={() => setActiveProfileModal('me')}>
            <span className={styles.cardIcon}><i className="fa-solid fa-user-pen"></i></span>
            <span className={styles.cardTitle}>自分の情報を見る</span>
          </button>
        </div>

        <DailyStatusModal
          isOpen={isDailyStatusModalOpen}
          status={myDailyStatus}
          onClose={() => setIsDailyStatusModalOpen(false)}
          onSave={handleSaveDailyStatus}
          isSubmitting={isStatusSubmitting}
        />

        <GoalModal
          isOpen={isGoalModalOpen}
          nickname={userData?.nickname || userData?.displayName || "自分"}
          currentGoal={userData?.goal || ""}
          onClose={() => setIsGoalModalOpen(false)}
          onSave={handleSaveGoal}
          isSubmitting={isGoalSubmitting}
        />
      </div>
    </AuthGuard>
  );
}
