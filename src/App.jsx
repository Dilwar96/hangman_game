import React, { useState, useEffect, useCallback } from "react";
import { words } from "./words";
import confetti from "canvas-confetti";
import "./App.css";

const CATEGORIES = {
  animals: {
    ar: ['قط', 'كلب', 'أسد', 'فيل', 'زرافة'],
    en: ['cat', 'dog', 'lion', 'elephant', 'giraffe'],
    de: ['katze', 'hund', 'löwe', 'elefant', 'giraffe']
  },
  colors: {
    ar: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'أبيض'],
    en: ['red', 'blue', 'green', 'yellow', 'white'],
    de: ['rot', 'blau', 'grün', 'gelb', 'weiß']
  },
  food: {
    ar: ['خبز', 'حليب', 'جبن', 'تفاح', 'موز'],
    en: ['bread', 'milk', 'cheese', 'apple', 'banana'],
    de: ['brot', 'milch', 'käse', 'apfel', 'banane']
  }
};

// Sound effects
const sounds = {
  click: new Audio('/sounds/click.mp3'),
  correct: new Audio('/sounds/correct.mp3'),
  wrong: new Audio('/sounds/wrong.mp3'),
  win: new Audio('/sounds/win.mp3'),
  lose: new Audio('/sounds/lose.mp3')
};

// Initialize sounds
const initSounds = () => {
  Object.values(sounds).forEach(sound => {
    sound.load();
    sound.volume = 0.5; // Set volume to 50%
  });
};

// Play sound with error handling
const playSound = (soundName) => {
  try {
    const sound = sounds[soundName];
    if (sound) {
      sound.currentTime = 0; // Reset sound to start
      sound.play().catch(error => console.log('Audio play failed:', error));
    }
  } catch (error) {
    console.log('Error playing sound:', error);
  }
};

const celebrateWin = () => {
  const duration = 3 * 1000;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = duration - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50;

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

const App = () => {
  const [playerName, setPlayerName] = useState("");
  const [language, setLanguage] = useState("ar");
  const [level, setLevel] = useState("easy");
  const [category, setCategory] = useState("animals");
  const [selectedWord, setSelectedWord] = useState("");
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongLetters, setWrongLetters] = useState([]);
  const [gameStatus, setGameStatus] = useState("start");
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    JSON.parse(localStorage.getItem('hangmanHighScore')) || 0
  );
  const [streak, setStreak] = useState(0);
  const [hint, setHint] = useState("");
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    bestStreak: 0,
    averageTime: 0
  });
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (gameStatus === "playing") {
      if (timer > 0) {
        const interval = setInterval(() => {
          setTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setGameStatus("lost");
      }
    }
  }, [timer, gameStatus]);

  const getHint = useCallback(() => {
    if (!selectedWord) return;
    const unguessedLetters = selectedWord
      .split("")
      .filter(letter => !guessedLetters.includes(letter));
    if (unguessedLetters.length > 0) {
      const randomLetter = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
      setHint(randomLetter);
      setTimeout(() => setHint(""), 1500);
    }
  }, [selectedWord, guessedLetters]);

  useEffect(() => {
    initSounds();
  }, []);

  useEffect(() => {
    const savedStats = localStorage.getItem('hangmanStats');
    if (savedStats) {
      setGameStats(JSON.parse(savedStats));
    }
  }, []);

  const updateStats = (won, timeSpent) => {
    setGameStats(prev => {
      const newStats = {
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + (won ? 1 : 0),
        bestStreak: Math.max(prev.bestStreak, won ? streak + 1 : streak),
        averageTime: Math.round(((prev.averageTime * prev.gamesPlayed) + timeSpent) / (prev.gamesPlayed + 1))
      };
      localStorage.setItem('hangmanStats', JSON.stringify(newStats));
      return newStats;
    });
  };

  const startGame = () => {
    if (!playerName.trim()) {
      alert("Please enter your name first!");
      return;
    }
    const wordList = CATEGORIES[category][language];
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    setSelectedWord(word);
    setGuessedLetters([]);
    setWrongLetters([]);
    setGameStatus("playing");
    setTimer(level === "easy" ? 60 : level === "medium" ? 45 : 30);
    setHint("");
  };

  const calculateScore = (remainingTime, difficulty) => {
    const baseScore = {
      easy: 100,
      medium: 200,
      hard: 300
    }[difficulty];
    return baseScore + (remainingTime * 10);
  };

  const handleGuess = (letter) => {
    if (
      guessedLetters.includes(letter) ||
      wrongLetters.includes(letter) ||
      gameStatus !== "playing"
    )
      return;
    if (selectedWord.includes(letter)) {
      playSound('correct');
      setGuessedLetters((prev) => [...prev, letter]);
    } else {
      playSound('wrong');
      setWrongLetters((prev) => [...prev, letter]);
    }
  };

  useEffect(() => {
    if (!selectedWord) return;
    const isWinner = selectedWord
      .split("")
      .every((letter) => guessedLetters.includes(letter));
    if (isWinner) {
      playSound('win');
      const newScore = calculateScore(timer, level);
      setScore(prev => prev + newScore);
      setStreak(prev => prev + 1);
      if (score + newScore > highScore) {
        setHighScore(score + newScore);
        localStorage.setItem('hangmanHighScore', JSON.stringify(score + newScore));
      }
      celebrateWin();
      updateStats(true, 60 - timer);
      setGameStatus("won");
    } else if (wrongLetters.length >= 6) {
      playSound('lose');
      setStreak(0);
      updateStats(false, 60 - timer);
      setGameStatus("lost");
    }
  }, [guessedLetters, wrongLetters, selectedWord]);

  const renderHangman = () => {
    const parts = [
      "head",
      "body",
      "left-arm",
      "right-arm",
      "right-leg",
      "left-leg",
    ];

    return parts.map((part, index) => {
      let extraClass = "";
      if (gameStatus === "lost") {
        extraClass = "animate-shake";
      }
      return (
        <div
          key={part}
          className={`hangman-part ${part} ${
            wrongLetters.length > index ? "visible" : ""
          } ${extraClass}`}
        ></div>
      );
    });
  };

  const alphabet = {
    ar: "ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
    en: "abcdefghijklmnopqrstuvwxyz",
    de: "abcdefghijklmnopqrstuvwxyzäöüß",
  };

  const isRtl = language === "ar";

  if (gameStatus === "start") {
    return (
      <div className={`start-screen ${isRtl ? "rtl" : ""}`}>
        <h1 className="title">🕹️ لعبة الرجل المشنوق</h1>
        <div className="selectors">
          <div>
            <label>👤 اسمك:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="name-input"
              placeholder="ادخل اسمك هنا"
              maxLength={20}
            />
          </div>
          <div>
            <label>🌍 اختر اللغة:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="ar">العربية 🇸🇦</option>
              <option value="en">English 🇬🇧</option>
              <option value="de">Deutsch 🇩🇪</option>
            </select>
          </div>
          <div>
            <label>🎯 اختر الفئة:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
            >
              <option value="animals">🦁 حيوانات</option>
              <option value="colors">🎨 ألوان</option>
              <option value="food">🍎 طعام</option>
            </select>
          </div>
          <div>
            <label>⚡ اختر المستوى:</label>
            <select 
              value={level} 
              onChange={(e) => setLevel(e.target.value)}
              className={`level-select ${level}`}
            >
              <option value="easy" className="easy-option">🟢 سهل</option>
              <option value="medium" className="medium-option">🟡 متوسط</option>
              <option value="hard" className="hard-option">🔴 صعب</option>
            </select>
          </div>
        </div>
        <button className="start-button" onClick={startGame}>
          🚀 ابدأ اللعبة
        </button>
      </div>
    );
  }

  return (
    <div className={`App ${isRtl ? "rtl" : ""}`}>
      <button
        className="stats-button"
        onClick={() => setShowStats(!showStats)}
      >
        📊 إحصائيات
      </button>

      {showStats && (
        <div className="stats-modal">
          <div className="stats-content">
            <h3>📊 إحصائيات اللعب</h3>
            <p>🎮 عدد المباريات: {gameStats.gamesPlayed}</p>
            <p>🏆 المباريات المربوحة: {gameStats.gamesWon}</p>
            <p>🔥 أفضل سلسلة فوز: {gameStats.bestStreak}</p>
            <p>⏱️ متوسط الوقت: {gameStats.averageTime}s</p>
            <button
              className="close-stats"
              onClick={() => setShowStats(false)}
            >
              ✖️ إغلاق
            </button>
          </div>
        </div>
      )}

      <div className="game-stats">
        <div className="player-name">👤 {playerName}</div>
        <div className="timer">⏰ {timer}s</div>
        <div className="score">🏆 Score: {score}</div>
        <div className="high-score">👑 High Score: {highScore}</div>
        <div className="streak">🔥 Streak: {streak}</div>
      </div>
      {hint && <div className="hint-popup">💡 Hint: {hint}</div>}

      <div className="hangman-container">
        <div className="gallows"></div>
        <div className="base"></div>
        <div className="top"></div>
        <div className="rope"></div>
        {renderHangman()}
      </div>

      <div className="word">
        {selectedWord.split("").map((letter, idx) => (
          <span key={idx} className="letter">
            {guessedLetters.includes(letter) || gameStatus !== "playing"
              ? letter
              : ""}
          </span>
        ))}
      </div>

      <div className="game-controls">
        <button
          onClick={getHint}
          disabled={gameStatus !== "playing" || hint}
          className="hint-button"
        >
          💡 Get Hint
        </button>
      </div>
      <div className="keyboard">
        {alphabet[language].split("").map((letter) => (
          <button
            key={letter}
            onClick={() => handleGuess(letter)}
            disabled={
              guessedLetters.includes(letter) ||
              wrongLetters.includes(letter) ||
              gameStatus !== "playing"
            }
            className="letter-button"
          >
            {letter}
          </button>
        ))}
      </div>

      {gameStatus !== "playing" && (
        <div className="result">
          <h2>{gameStatus === "won" ? "🎉 فزت!" : "😢 خسرت!"}</h2>
          <button
            onClick={() => setGameStatus("start")}
            className="restart-button"
          >
            🔁 العودة للبداية
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
