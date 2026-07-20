"use client";

import React, { useEffect, useState } from "react";
import styles from "./BirthdayCelebration.module.css";
import FireworksCanvas from "./FireworksCanvas";

interface BirthdayCelebrationProps {
  isMyBirthday: boolean;
  isPartnerBirthday: boolean;
  myNickname: string;
  partnerNickname: string;
  onClose: () => void;
}

interface Particle {
  id: number;
  content: string;
  left: number; // 0-100%
  size: number; // px
  duration: number; // s
  delay: number; // s
}

const EMOJIS = ["🎉", "🎂", "🎈", "🍬", "🍭", "✨", "🎁", "💖", "⭐", "🥳", "🍓"];

export default function BirthdayCelebration({
  isMyBirthday,
  isPartnerBirthday,
  myNickname,
  partnerNickname,
  onClose,
}: BirthdayCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // 35個のランダムな紙吹雪/キャンディパーティクルを生成
    const generated: Particle[] = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      content: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      left: Math.random() * 95,
      size: 18 + Math.random() * 22,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
    }));
    setParticles(generated);
  }, []);

  // 主役のテキスト
  let title = "HAPPY BIRTHDAY!";
  let subtitle = "Special Day 🎉";
  let celebrationName = "";
  let message = "";

  if (isMyBirthday && isPartnerBirthday) {
    subtitle = "Miracle Double Birthday 🎉";
    celebrationName = `${myNickname} & ${partnerNickname}`;
    message = `奇跡的に今日はお二人ともお誕生日です！お互いにとって最高の最高に幸せで特別な1日になりますように✨`;
  } else if (isMyBirthday) {
    subtitle = "Happy Birthday to You 🎉";
    celebrationName = `${myNickname}`;
    message = `${myNickname}さん、お誕生日おめでとうございます！笑顔いっぱいでたくさんのハッピーに包まれる素晴らしい1年になりますように🍭✨`;
  } else if (isPartnerBirthday) {
    subtitle = "Partner's Birthday 🎉";
    celebrationName = `${partnerNickname}`;
    message = `今日は大切な${partnerNickname}さんのお誕生日です！二人で最高にステキな思い出を作ってくださいね🎁💕`;
  }

  return (
    <>
      {/* 無限花火キャンバスアニメーション */}
      <FireworksCanvas />

      {/* 画面全体の紙吹雪/パーティクル演出 */}
      <div className={styles.particlesContainer}>
        {particles.map((p) => (
          <span
            key={p.id}
            className={styles.particle}
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          >
            {p.content}
          </span>
        ))}
      </div>

      {/* バースデーモーダル */}
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div className={styles.sparkleBg} />

          <div className={styles.cakeWrapper}>
            <span className={styles.mainCakeIcon}>🎂</span>
            <span className={styles.crownBadge}>👑</span>
          </div>

          <div className={styles.subtitle}>{subtitle}</div>
          <h2 className={styles.title}>{title}</h2>

          <div className={styles.namesHighlight}>
            <span className={styles.nameItem}>✨ {celebrationName} ✨</span>
          </div>

          <p className={styles.message}>{message}</p>

          <button className={styles.closeBtn} onClick={onClose}>
            <span>ありがとう！お祝いする 🥂</span>
          </button>
        </div>
      </div>
    </>
  );
}
