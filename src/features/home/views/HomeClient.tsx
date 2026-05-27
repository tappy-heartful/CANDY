"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getWishlist } from "@/src/features/wishlist/api/wishlist-client-service";
import { getPartnerData, updateProfile } from "@/src/features/user/api/user-client-service";
import { getDailyStatuses, saveDailyStatus } from "@/src/features/home/api/daily-status-client-service";
import { getEvents } from "@/src/features/calendar/api/calendar-client-service";
import { getGroups } from "@/src/features/todo/api/todo-client-service";
import { Wishlist, User as FirestoreUser, DailyStatus, CalendarEvent, Group } from "@/src/lib/firestore/types";
import styles from "./Home.module.css";
import ProfileModal from "../components/ProfileModal";
import CalendarView from "@/src/features/calendar/components/CalendarView";
import DailyStatusCard from "../components/DailyStatusCard";
import DailyStatusModal from "../components/DailyStatusModal";

const CLOCK_THEMES = [
  { id: "themePinkyRibbon", type: "digital" },
  { id: "themeMintyBubble", type: "digital" },
  { id: "themeMilkyStar", type: "digital" },
  { id: "themeSunnyCitrus", type: "digital" },
  { id: "themeCottonCandy", type: "digital" },
  { id: "themeClassicPastel", type: "analog" },
  { id: "themeMacaronClock", type: "analog" },
  { id: "themeBerryPie", type: "analog" },
  { id: "themeOceanPearl", type: "analog" },
  { id: "themeNightOwl", type: "analog" },
  { id: "themeRainbowPop", type: "digital" },
  { id: "themeNeonCyber", type: "digital" },
  { id: "themeMatchaLatte", type: "analog" },
  { id: "themeSweetDonut", type: "analog" },
  { id: "themeGalaxyMagic", type: "digital" },
];

export default function HomeClient() {
  const { user, userData } = useAuth();
  const [recentWishlist, setRecentWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  const [activeProfileModal, setActiveProfileModal] = useState<'partner' | 'me' | null>(null);
  const [myDailyStatus, setMyDailyStatus] = useState<DailyStatus | null>(null);
  const [partnerDailyStatus, setPartnerDailyStatus] = useState<DailyStatus | null>(null);
  const [isDailyStatusModalOpen, setIsDailyStatusModalOpen] = useState(false);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [wishlistGroups, setWishlistGroups] = useState<Group[]>([]);
  const [openCalendarDate, setOpenCalendarDate] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("themePinkyRibbon");

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
        getGroups("wishlist")
      ]).then(([wishData, partner, statuses, allEvents, groups]) => {
        const nowTime = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        const recentWishes = wishData.filter(w => w.createdAt && (nowTime - w.createdAt) <= oneDayMs);
        const sortedByDate = [...recentWishes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const myWishes = sortedByDate.filter(w => w.uid === user.uid).slice(0, 3);
        const partnerWishes = sortedByDate.filter(w => w.uid !== user.uid).slice(0, 3);
        const combined = [...myWishes, ...partnerWishes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setRecentWishlist(combined);
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

        setUpcomingEvents(validEvents.slice(0, 3));
        setWishlistGroups(groups);

        setLoading(false);
      });
    }
  }, [user, userData]);

  const handleSaveDailyStatus = async (data: Partial<DailyStatus>) => {
    setIsStatusSubmitting(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const submitData = {
        ...data,
        uid: user?.uid,
        date: todayStr,
        ...(myDailyStatus ? { id: myDailyStatus.id } : {})
      };
      await saveDailyStatus(submitData);
      setMyDailyStatus({ ...myDailyStatus, ...submitData } as DailyStatus);
      setIsDailyStatusModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const handleCycleTheme = async () => {
    const currentIndex = CLOCK_THEMES.findIndex((t) => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % CLOCK_THEMES.length;
    const nextThemeId = CLOCK_THEMES[nextIndex].id;
    setCurrentTheme(nextThemeId);
    
    if (user) {
      try {
        await updateProfile(user.uid, { clockTheme: nextThemeId });
      } catch (e) {
        console.error("Failed to save clock theme", e);
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

  const activeThemeObj = CLOCK_THEMES.find(t => t.id === currentTheme) || CLOCK_THEMES[0];

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
          <button className={styles.cycleThemeBtn} onClick={handleCycleTheme} title="テーマを変更">
            <i className="fa-solid fa-arrows-rotate"></i>
          </button>

          {activeThemeObj.type === "digital" ? (
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
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <DailyStatusCard
            user={userData as FirestoreUser}
            status={myDailyStatus}
            isMe={true}
            onEdit={() => setIsDailyStatusModalOpen(true)}
          />
          <DailyStatusCard
            user={partnerData}
            status={partnerDailyStatus}
            isMe={false}
          />
        </div>

        <div className="content-card">
          <div className="card-title-main">
            <i className="fa-solid fa-bell" style={{ color: "#A0E7D2" }}></i> 最新のお知らせ
          </div>
          <div className={styles.notificationList}>
            {loading ? (
              <div className={styles.emptyMsg}>読み込み中...</div>
            ) : (recentWishlist.length > 0 || upcomingEvents.length > 0) ? (
              <>
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
                          <div key={e.id} className={styles.notificationSubItem} onClick={() => setOpenCalendarDate(e.startDate)} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
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
                            <Link href="/wishlist" key={item.id} className={styles.notificationSubItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                              <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#999', alignItems: 'center' }}>
                                <span className={`${styles.badge} ${badgeClass}`}>{typeLabel}</span>
                                <span style={{fontWeight: 'bold'}}>{groupName}</span>
                              </div>
                              <span className={styles.notificationTitle}>{item.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </>
            ) : (
              <div className={styles.emptyMsg}>最近の追加はありません</div>
            )}
          </div>
        </div>

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

        <div className={styles.menuGrid}>
          <Link href="/wishlist" className={`${styles.menuCard} ${styles.cardWish}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-gift"></i></span>
            <span className={styles.cardTitle}>Wishlist</span>
          </Link>
          <Link href="/todo" className={`${styles.menuCard} ${styles.cardTodo}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-list-check"></i></span>
            <span className={styles.cardTitle}>TODO</span>
          </Link>
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
      </div>
    </AuthGuard>
  );
}
