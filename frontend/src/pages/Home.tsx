// @ts-nocheck
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

const greenTones = ["#2eff97", "#1fff62", "#29FD53", "#00FF00", "#3AFF74", "#61FF91", "#9FFFBE"];

function getRandomGreen() {
  return greenTones[Math.floor(Math.random() * greenTones.length)];
}

function createRandomBubble() {
  const size = Math.floor(Math.random() * 60) + 40;
  const top = Math.floor(Math.random() * 80) + 10 + "%";
  const left = Math.floor(Math.random() * 80) + 10 + "%";
  return {
    id: uuidv4(),
    width: size,
    height: size,
    top,
    left,
    bg: getRandomGreen(),
  };
}

function createRandomLine() {
  const top = Math.floor(Math.random() * 80) + 10 + "%";
  const width = Math.floor(Math.random() * 80) + 20;
  return {
    id: uuidv4(),
    top,
    width,
    height: 2,
    color: getRandomGreen(),
  };
}

const INITIAL_BUBBLES = [
  { id: "1", top: "10%", left: "15%", width: 80, height: 80, bg: "#29FD53" },
  { id: "2", top: "30%", left: "30%", width: 60, height: 60, bg: "#61FF91" },
  { id: "3", top: "70%", left: "60%", width: 100, height: 100, bg: "#9FFFBE" },
];

const Home = () => {
  const [bubbles, setBubbles] = useState(INITIAL_BUBBLES);
  const [lines, setLines] = useState<Array<{ id: string; top: string; width: number; height: number; color: string }>>(
    []
  );

  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) => [...prev, createRandomBubble()]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLines((prev) => [...prev, createRandomLine()]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  function handleRemoveBubble(id: string) {
    setBubbles((prev) => prev.filter((item) => item.id !== id));
  }

  function handleLineComplete(id: string) {
    setLines((prev) => prev.filter((item) => item.id !== id));
  }

  function handleGetStarted() {
    navigate("/dashboard");
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at 50% 50%, #0c1d13 0%, #061C15 30%, #03100B 100%)",
        overflow: "hidden",
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "url('https://www.transparenttextures.com/patterns/cubes.png') repeat",
          opacity: 0.05,
        }}
      />

      <motion.div
        initial={{ opacity: 0.15, scale: 1 }}
        animate={{ opacity: 0.3, scale: 1.2 }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(0,255,0,0.3), rgba(0,100,0,0.2))",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />

      <AnimatePresence>
        {bubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            exit={{ opacity: 0, scale: 0 }}
            initial={{ scale: 0.8, opacity: 0.5, rotate: 0 }}
            animate={{
              backgroundColor: [bubble.bg, getRandomGreen(), bubble.bg],
              opacity: [0.5, 1, 0.5],
              scale: [0.8, 1, 0.8],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            onClick={() => handleRemoveBubble(bubble.id)}
            style={{
              position: "absolute",
              top: bubble.top,
              left: bubble.left,
              width: bubble.width,
              height: bubble.height,
              backgroundColor: bubble.bg,
              borderRadius: "50%",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(0, 255, 100, 0.8)",
              userSelect: "none",
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {lines.map((line) => (
          <motion.div
            key={line.id}
            style={{
              position: "absolute",
              top: line.top,
              left: "-15%",
              width: `${line.width}%`,
              height: line.height,
              backgroundColor: line.color,
              opacity: 0.7,
              boxShadow: "0 0 8px rgba(0, 255, 100, 0.6)",
            }}
            initial={{ x: "0%" }}
            animate={{ x: "130%" }}
            transition={{ duration: 6, ease: "linear" }}
            onAnimationComplete={() => handleLineComplete(line.id)}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "6rem",
            margin: 0,
            padding: 0,
            fontWeight: 700,
            textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
            color: "#BFFFC8",
          }}
        >
          Credix
        </h1>
        <h2
          style={{
            fontSize: "2rem",
            margin: 0,
            padding: 0,
            fontWeight: 400,
            textAlign: "center",
            color: "#BFFFC8",
            textShadow: "0 0 6px rgba(0, 255, 0, 0.4)",
          }}
        >
          The Future of Peer-to-Peer Lending and Borrowing
        </h2>
        <motion.button
          onClick={handleGetStarted}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "9999px",
            border: "2px solid #BFFFC8",
            backgroundColor: "transparent",
            color: "#BFFFC8",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          Get Started
          <span style={{ transition: "transform 0.2s" }}>➜</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Home;
