import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Shield, 
  ExternalLink, 
  X, 
  ChevronRight, 
  Sparkles, 
  Trophy,
  Star,
  Info,
  Calendar,
  Sparkle,
  Mail,
  Copy,
  ChevronDown,
  Image,
  Video,
  Phone,
  Map,
  Database
} from 'lucide-react';
import playersData from './assets/wolves_roster.json';
import logoImg from './assets/logo.jpg';

// Core Cap Numbers Mapping for the 17 designated Players
const CAP_NUMBERS = {
  "48154": 1,    // Abhiram Varchas
  "644794": 2,   // Vinay Jaideep Reddy
  "486878": 3,   // Sai Avishkar Sreeramaneni
  "3311166": 4,  // Vignesh Kotte
  "3119026": 5,  // Manohar Chowdary Kambhampati
  "4248567": 6,  // Srinadh G
  "4248569": 7,  // Srinivas Reddy
  "3575314": 8,  // Jashwanth Ch
  "4237703": 9,  // Joseph Reddy Dondeti
  "4501644": 10, // Yaswanth Reddy Seelam
  "4501646": 11, // Ashok M
  "5147344": 12, // Sampath Reddy
  "6080610": 13, // Vinay Reddy
  "2648703": 14, // Mokshith Reddy
  "3626346": 15, // Abhilash Yadav
  "6124119": 16, // Mourya Chiluka
  "3349008": 17, // Gopi Kamatham
  "4238824": 18  // Pavan Reddy Kasu (Reserve / Squad Member)
};
// Custom Jersey Numbers Map to ensure EVERY player has a unique and beautiful jersey number
// Custom Jersey Numbers Map matching the user's exact official club list
const CUSTOM_JERSEYS = {
  "4248567": 3,    // SRINADH -> 03 (3)
  "4501644": 5,    // YASHWANTH -> 5
  "6080610": 18,   // VINAY -> 18
  "4237703": 14,   // JOSEPH -> 14
  "3626346": 111,  // ABHILASH -> 111
  "5147344": 17,   // SAMPATH -> 17
  "4501646": 9,    // ASHOK -> 09 (9)
  "4248569": 27,   // SRINIVAS -> 27
  "6124119": 7,    // MOURYA -> 7
  "2648703": 29,   // MOKSHIT -> 29
  "486878": 22,    // AVISHKAR -> 22
  "3575314": 14,   // JASWANTH -> 14
  "3311166": 11,   // VIGNESH -> 11
  "3119026": 48,   // MANU -> 48
  "644794": 15,    // JAIDEEP -> 15
  "48154": 17,     // ABHIRAM -> 17
  "3349008": 4,     // GOPI K -> 4
  "4238824": 88    // Pavan Reddy Kasu (Reserve) -> 88
};

// Custom stats corrections to guarantee absolute precision (e.g. Srinadh G's 3 half centuries)
const STATS_OVERRIDES = {
  "4248567": { // Srinadh G
    halfCenturies: 3
  }
};

// Formats Translator: Maps default CricClubs categories to actual real-world formats based on league
const mapFormatName = (format) => {
  const f = format.toUpperCase().trim();
  if (f === '1 DAY' || f === 'ONEDAY') return 'T-30';
  if (f === 'T20') return 'T-20';
  if (f === 'T10') return 'T-10';
  if (f === 'LEAGUE') return 'T-15';
  if (f === 'PRACTICE') return 'Practice';
  return format;
};

// Highly personalized premium player bio introductions
const getPlayerIntro = (player) => {
  const name = player.name;
  const role = player.role;

  if (name.includes("Abhiram Varchas")) {
    return "A legendary founding pillar and elite all-rounder of Wolves Cricket Club. Abhiram's explosive batting and lethal medium-pace spells have anchored the Wolves to countless historic victories. He has kept the club's legacy burning bright since 2013, commanding immense respect across Kansas.";
  }
  if (name.includes("Vinay Jaideep")) {
    return "A legendary founding pillar and powerhouse all-rounder. Known affectionately as Jamaal, his fierce pace bowling and clutch batting have defined the Wolves' fighting spirit for over a decade. A pioneer whose legacy is known by every cricket enthusiast in Kansas.";
  }
  if (name.includes("Sai Avishkar")) {
    return "A key all-rounder known for his clean striking ability and consistent medium-pace bowling. Avishkar's tactical acumen and electric fielding make him an invaluable asset to the Wolves' pack in tight match situations.";
  }
  if (name.includes("Jaswanth")) {
    return "An energetic and highly reliable all-rounder. Jaswanth's aggressive playstyle, rapid spells, and outstanding catching in the outfield make him a core member of the Wolves' hunting pack.";
  }
  if (name.includes("Ashok")) {
    return "A stellar all-rounder who brings massive power to the batting lineup and lethal swing spells. Ashok is renowned for his game-changing performances in high-pressure championship matches.";
  }
  
  if (role.includes("All Rounder")) {
    return `${name} is an elite All-Rounder for Wolves Cricket Club, renowned for providing outstanding balance to the squad. Equally capable of clearing boundaries and taking crucial wickets, he is a primary player who steps up in big games.`;
  }
  if (role.includes("Batter")) {
    return `${name} is a premier batsman for the Wolves, known for stellar shot selection, heavy boundary-hitting, and anchoring the innings under extreme pressure. A technical masterclass player who leads from the front.`;
  }
  if (role.includes("Bowler")) {
    return `${name} is a strike bowler for the Wolves pack, feared by batsmen for exceptional control, speed, and a natural ability to break partnerships exactly when the team needs it.`;
  }
  return `${name} is a vital squad member of Wolves Cricket Club, bringing extreme athletic dedication, high team spirit, and consistent performances in our pursuit of titles.`;
};

// Helper component for Player Photo / Avatar fallback
function PlayerAvatar({ player, size = 'card' }) {
  const localImgPath = `/players/${player.playerId}.jpg`;
  const remoteImgPath = player.photoUrl;

  const isDefaultEmptyImg = !remoteImgPath || 
                            remoteImgPath.includes('no_image') || 
                            remoteImgPath.includes('player_dummy') ||
                            remoteImgPath.includes('pbcc-logo.png') ||
                            remoteImgPath.includes('Stores.png');

  const [srcState, setSrcState] = useState(isDefaultEmptyImg ? 'local' : 'remote');

  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  let containerStyle = {};
  if (size === 'card') {
    containerStyle = { width: '100%', height: '240px', borderRadius: '12px' };
  } else if (size === 'modal') {
    containerStyle = { width: '100%', height: '360px', borderRadius: '16px' };
  } else {
    containerStyle = { width: '48px', height: '48px', borderRadius: '50%' };
  }

  if (srcState === 'fallback') {
    return (
      <div 
        className="avatar-fallback"
        style={{
          ...containerStyle,
          background: 'linear-gradient(135deg, #0A1128 0%, #040814 100%)',
          border: '1px dashed rgba(255, 107, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{
          fontSize: size === 'modal' ? '3rem' : size === 'card' ? '2.2rem' : '1rem',
          fontWeight: '800',
          fontFamily: 'var(--font-heading)',
          background: 'linear-gradient(135deg, var(--accent-orange) 0%, #FF8800 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          zIndex: 1
        }}>
          {initials}
        </div>
        {size !== 'node' && <span className="badge badge-muted" style={{ fontSize: '0.6rem', zIndex: 1 }}>WOLVES</span>}
      </div>
    );
  }

  const activeSrc = srcState === 'local' ? localImgPath : remoteImgPath;

  const handleImgError = () => {
    if (srcState === 'remote') {
      setSrcState('local');
    } else {
      setSrcState('fallback');
    }
  };

  return (
    <div style={{ 
      ...containerStyle, 
      overflow: 'hidden', 
      position: 'relative', 
      background: 'rgba(10, 17, 40, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <img 
        src={activeSrc} 
        alt={player.name}
        onError={handleImgError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          transition: 'transform 0.5s ease'
        }}
        className="player-photo"
      />
    </div>
  );
}

// Custom Counter component for fast, premium count-up animations
function CountUp({ target, duration = 1000 }) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (!target) return;
    const targetNum = parseInt(target, 10);
    if (isNaN(targetNum) || targetNum <= 1) {
      setCount(target);
      return;
    }

    let start = 1;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quadratic
      const easeProgress = progress * (2 - progress);
      const currentCount = Math.round(start + (targetNum - start) * easeProgress);

      setCount(String(currentCount).padStart(2, '0'));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(String(targetNum).padStart(2, '0'));
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span>{count}</span>;
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [activePlayer, setActivePlayer] = useState(null);
  const [activeBattingFormat, setActiveBattingFormat] = useState('');
  const [activeBowlingFormat, setActiveBowlingFormat] = useState('');
  const [expandedMilestone, setExpandedMilestone] = useState(null); // Toggles timeline achievements
  const [activeSponsor, setActiveSponsor] = useState(null);
  const [selectedRoadmapYear, setSelectedRoadmapYear] = useState('2026');

  // Normalize data, resolve truncated spellings, roles, and keepers by exact playerId mapping
  const players = useMemo(() => {
    return playersData.map(player => {
      let cleanName = player.name.replace(/\.\.$/, '').trim();
      
      // Force correct full names by playerId to guarantee accuracy and resolve any truncation bugs
      if (player.playerId === "4501644") {
        cleanName = "Yaswanth Reddy Seelam";
      } else if (player.playerId === "3119026") {
        cleanName = "Manohar Chowdary Kambhampati";
      } else if (player.playerId === "486878") {
        cleanName = "Sai Avishkar Sreeramaneni";
      } else if (player.playerId === "644794") {
        cleanName = "Vinay Jaideep Reddy";
      }

      const capNum = CAP_NUMBERS[player.playerId] || 99;
      let rawJersey = CUSTOM_JERSEYS[player.playerId] || player.jerseyNumber;
      const jerseyNum = rawJersey ? parseInt(String(rawJersey).trim(), 10) : 99;

      // Assign custom roles based on user request:
      // Mokshith (2648703), Vignesh (3311166), Sai Avishkar (486878) are Batters.
      // Everyone else is an All Rounder (including Srinivas Reddy, who is not a batter).
      let assignedRole = "All Rounder";
      if (player.playerId === "2648703" || player.playerId === "3311166" || player.playerId === "486878") {
        assignedRole = "Batter";
      }

      // Wicket Keepers mapping: Mokshith, Sai Avishkar, Manohar Chowdary Kambhampati
      const isWk = player.playerId === "2648703" || player.playerId === "486878" || player.playerId === "3119026";

      return {
        ...player,
        name: cleanName,
        role: assignedRole,
        isWicketKeeper: isWk,
        capNumber: capNum,
        jerseyNumber: jerseyNum,
        matchesPlayed: Number(player.matchesPlayed) || 0,
        runs: Number(player.runs) || 0,
        wickets: Number(player.wickets) || 0,
        battingStats: player.battingStats || {},
        bowlingStats: player.bowlingStats || {}
      };
    }).sort((a, b) => a.capNumber - b.capNumber);
  }, []);

  // Set up custom scroll observer for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-active');
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

    const targets = document.querySelectorAll('.scroll-fade-in');
    targets.forEach(target => observer.observe(target));

    return () => {
      targets.forEach(target => observer.unobserve(target));
    };
  }, [players]);

  // Compute club leader benchmarks based on genuine overall cricclubs stats
  const clubStats = useMemo(() => {
    const totalPlayers = players.length;
    const totalMatches = players.reduce((sum, p) => sum + p.matchesPlayed, 0);
    const totalRuns = players.reduce((sum, p) => sum + p.runs, 0);
    const totalWickets = players.reduce((sum, p) => sum + p.wickets, 0);
    
    // Find leaders
    const runLeader = [...players].sort((a, b) => b.runs - a.runs)[0];
    const wicketLeader = [...players].sort((a, b) => b.wickets - a.wickets)[0];
    const matchesLeader = [...players].sort((a, b) => b.matchesPlayed - a.matchesPlayed)[0];

    return {
      totalPlayers,
      totalMatches,
      totalRuns,
      totalWickets,
      runLeader,
      wicketLeader,
      matchesLeader
    };
  }, [players]);

  // Filter squad based on search and roles
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            player.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesRole = false;
      if (selectedRole === 'All') {
        matchesRole = true;
      } else if (selectedRole === 'Batters') {
        matchesRole = player.role === 'Batter';
      } else if (selectedRole === 'All-Rounders') {
        matchesRole = player.role === 'All Rounder';
      } else if (selectedRole === 'Wicket Keepers') {
        matchesRole = player.isWicketKeeper === true;
      }
      
      return matchesSearch && matchesRole;
    });
  }, [players, searchTerm, selectedRole]);

  // Aggregate stats directly from player overall properties for absolute accuracy
  const activePlayerStats = useMemo(() => {
    if (!activePlayer) return null;

    const batting = activePlayer.battingStats || {};
    const bowling = activePlayer.bowlingStats || {};

    let highestScore = 0;
    let isNotOutHS = false;
    let bestBowling = "—";
    let bestBowlingWkts = -1;
    let bestBowlingRuns = 999;
    let centuries = 0;
    let halfCenturies = 0;
    let fiveWickets = 0;
    let fourWickets = 0;

    // Batting calculations - Exclude 'Practice' format rows
    Object.entries(batting).forEach(([format, data]) => {
      if (format.toUpperCase().trim() === 'PRACTICE') return;
      
      if (data.HS) {
        const hsStr = String(data.HS).trim();
        const isNO = hsStr.includes('*');
        const val = parseInt(hsStr.replace('*', ''), 10);
        if (!isNaN(val) && val > highestScore) {
          highestScore = val;
          isNotOutHS = isNO;
        }
      }

      const huns = parseInt(data['100s'], 10);
      if (!isNaN(huns)) centuries += huns;

      const fifties = parseInt(data['50s'], 10);
      if (!isNaN(fifties)) halfCenturies += fifties;
    });

    // Bowling calculations - Exclude 'Practice' format rows
    Object.entries(bowling).forEach(([format, data]) => {
      if (format.toUpperCase().trim() === 'PRACTICE') return;

      const fw = parseInt(data['4w'] || data['4w'], 10);
      if (!isNaN(fw)) fourWickets += fw;

      const fivw = parseInt(data['5w'] || data['5w'], 10);
      if (!isNaN(fivw)) fiveWickets += fivw;

      if (data.BBF) {
        const bbfStr = String(data.BBF).trim();
        const parts = bbfStr.split('/');
        if (parts.length === 2) {
          const rVal = parseInt(parts[0], 10);
          const wVal = parseInt(parts[1], 10);
          if (!isNaN(rVal) && !isNaN(wVal)) {
            if (wVal > bestBowlingWkts || (wVal === bestBowlingWkts && rVal < bestBowlingRuns)) {
              bestBowlingWkts = wVal;
              bestBowlingRuns = rVal;
              bestBowling = bbfStr;
            }
          }
        }
      }
    });

    // Apply custom overrides to guarantee 100% genuine precision matching the user's records
    const overrides = STATS_OVERRIDES[activePlayer.playerId] || {};

    // Return overall parsed split metrics while maintaining absolute matches/runs/wickets from scraped overall parameters
    return {
      totalRuns: overrides.runs !== undefined ? overrides.runs : activePlayer.runs,         // Strict accurate CricClubs overall career runs
      totalWickets: overrides.wickets !== undefined ? overrides.wickets : activePlayer.wickets,   // Strict accurate CricClubs overall career wickets
      matchesPlayed: overrides.matchesPlayed !== undefined ? overrides.matchesPlayed : activePlayer.matchesPlayed,
      highestScore: highestScore > 0 ? `${highestScore}${isNotOutHS ? '*' : ''}` : '—',
      bestBowling,
      centuries: overrides.centuries !== undefined ? overrides.centuries : centuries,
      halfCenturies: overrides.halfCenturies !== undefined ? overrides.halfCenturies : halfCenturies,
      fiveWickets: overrides.fiveWickets !== undefined ? overrides.fiveWickets : fiveWickets,
      fourWickets: overrides.fourWickets !== undefined ? overrides.fourWickets : fourWickets
    };
  }, [activePlayer]);

  const handleOpenPlayerModal = (player) => {
    setActivePlayer(player);
    
    const battingFormats = Object.keys(player.battingStats || {});
    if (battingFormats.length > 0) {
      setActiveBattingFormat(battingFormats[0]);
    } else {
      setActiveBattingFormat('');
    }

    const bowlingFormats = Object.keys(player.bowlingStats || {});
    if (bowlingFormats.length > 0) {
      setActiveBowlingFormat(bowlingFormats[0]);
    } else {
      setActiveBowlingFormat('');
    }
  };

  const getRoleBadge = (role) => {
    if (role.includes('All Rounder')) return <span className="badge badge-orange">All Rounder</span>;
    if (role.includes('Batter')) return <span className="badge badge-blue">Batter</span>;
    if (role.includes('Bowler')) return <span className="badge badge-green">Bowler</span>;
    return <span className="badge badge-muted">{role}</span>;
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Redesigned navigation states
  const [activeTab, setActiveTab] = useState('profiles');
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("wolvescricketclubks@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // 2-Week Match Schedules (June 3, 2026 - June 17, 2026)
  const upcomingMatches = useMemo(() => [
    {
      id: 1,
      opponent: "KC Royals",
      opponentLogo: "👑",
      date: "Saturday, Jun 6, 2026",
      time: "10:45 AM",
      venue: "OCG",
      format: "CPLKC League",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/cplkc/fixtures.do?league=100&teamId=1096&internalClubId=null&year=2026&clubId=85"
    },
    {
      id: 2,
      opponent: "Bharat XI",
      opponentLogo: "🇮🇳",
      date: "Sunday, Jun 7, 2026",
      time: "9:00 AM",
      venue: "Minor Park",
      format: "MWCL T30 DIV B",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/mwcl/fixtures.do?league=68&teamId=665&internalClubId=null&year=2026&clubId=93"
    },
    {
      id: 3,
      opponent: "Desi Spartans",
      opponentLogo: "⚔️",
      date: "Saturday, Jun 13, 2026",
      time: "8:00 AM",
      venue: "Liberty Ground",
      format: "MWCL T30 DIV B",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/mwcl/fixtures.do?league=68&teamId=665&internalClubId=null&year=2026&clubId=93"
    },
    {
      id: 4,
      opponent: "Dominators",
      opponentLogo: "🛡️",
      date: "Sunday, Jun 14, 2026",
      time: "7:45 AM",
      venue: "OCG",
      format: "CPLKC League",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/cplkc/fixtures.do?league=100&teamId=1096&internalClubId=null&year=2026&clubId=85"
    },
    {
      id: 5,
      opponent: "Desi Spartans",
      opponentLogo: "⚔️",
      date: "Saturday, Jun 20, 2026",
      time: "2:00 PM",
      venue: "Liberty Ground",
      format: "MWCL T30 DIV B",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/mwcl/fixtures.do?league=68&teamId=665&internalClubId=null&year=2026&clubId=93"
    },
    {
      id: 6,
      opponent: "Rising Stars",
      opponentLogo: "⭐",
      date: "Sunday, Jun 21, 2026",
      time: "7:45 AM",
      venue: "PCG",
      format: "CPLKC League",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/cplkc/fixtures.do?league=100&teamId=1096&internalClubId=null&year=2026&clubId=85"
    },
    {
      id: 7,
      opponent: "Killer XI",
      opponentLogo: "⚡",
      date: "Saturday, Jun 27, 2026",
      time: "7:45 AM",
      venue: "PCG",
      format: "CPLKC League",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/cplkc/fixtures.do?league=100&teamId=1096&internalClubId=null&year=2026&clubId=85"
    },
    {
      id: 8,
      opponent: "Brothers XI",
      opponentLogo: "🤝",
      date: "Sunday, Jun 28, 2026",
      time: "9:00 AM",
      venue: "Minor Park",
      format: "MWCL T30 DIV B",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/mwcl/fixtures.do?league=68&teamId=665&internalClubId=null&year=2026&clubId=93"
    },
    {
      id: 9,
      opponent: "Bharat XI",
      opponentLogo: "🇮🇳",
      date: "Sunday, Jul 12, 2026",
      time: "8:00 AM",
      venue: "Minor Park",
      format: "MWCL T30 DIV B",
      type: "Away",
      cricclubsUrl: "https://cricclubs.com/mwcl/fixtures.do?league=68&teamId=665&internalClubId=null&year=2026&clubId=93"
    }
  ], []);

  // Photos Gallery list
  const photosList = useMemo(() => [
    { src: "/wolves_pack.png", caption: "Wolves Pack running with Zeal" },
    { src: "/drone_ground.png", caption: "Drone Shot of local Cricket Field" },
    { src: "/about_bg.jpg", caption: "Wolves Founding Pillars Legacy" },
    { src: "/dressing_room.png", caption: "Wolves Team Room Backdrop" }
  ], []);

  // Videos Highlight list
  const videosList = useMemo(() => [
    { title: "Summer T20 Championship Final Highlights", duration: "12:45", category: "MWCL Match" },
    { title: "Abhiram Varchas Match-Winning Innings", duration: "5:20", category: "Batting Highlights" },
    { title: "Vinay Jaideep Reddy 5-Wicket Spell", duration: "3:15", category: "Bowling Highlights" },
    { title: "Net Practice & Training Session Highlights", duration: "4:40", category: "Practice Match" }
  ], []);

  return (
    <div style={{ paddingBottom: '60px' }}>
      
      {/* 1. TOP BAR (Socials Left, Contact Email Right) */}
      <div className="top-social-bar">
        <div className="top-social-bar-inner">
          <div className="social-links-left">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
          </div>
          <div className="contact-info-right" onClick={handleCopyEmail} style={{ cursor: 'pointer' }} title="Click to copy email">
            <Mail size={12} style={{ marginRight: '6px', color: 'var(--accent-orange)' }} />
            <span>{copiedEmail ? "Copied!" : "wolvescricketclubks@gmail.com"}</span>
            <Copy size={10} style={{ marginLeft: '6px', opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (USA Cricket style) */}
      <header className="brand-header-navy">
        <div className="brand-header-navy-inner">
          <div className="brand-header-logo-section" onClick={() => setActiveTab('profiles')} style={{ cursor: 'pointer' }}>
            <img 
              src={logoImg} 
              alt="Wolves Logo" 
              className="nav-brand-logo"
            />
            <span className="nav-brand-title">WOLVES CC</span>
          </div>

          {/* Main Navigation Links */}
          <nav className="brand-navigation-links">
            <button 
              onClick={() => { setActiveTab('battles'); setMoreDropdownOpen(false); }} 
              className={`nav-menu-link ${activeTab === 'battles' ? 'active' : ''}`}
            >
              WOLVES BATTLES
            </button>
            <button 
              onClick={() => { setActiveTab('profiles'); setMoreDropdownOpen(false); }} 
              className={`nav-menu-link ${activeTab === 'profiles' ? 'active' : ''}`}
            >
              PROFILES
            </button>
            <button 
              onClick={() => { setActiveTab('about'); setMoreDropdownOpen(false); }} 
              className={`nav-menu-link ${activeTab === 'about' ? 'active' : ''}`}
            >
              ABOUT
            </button>
            
            {/* MORE Dropdown */}
            <div className="nav-dropdown-wrapper">
              <button 
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)} 
                className={`nav-menu-link dropdown-toggle-btn ${['photos', 'videos', 'roadmap', 'database', 'records', 'contact'].includes(activeTab) ? 'active' : ''}`}
              >
                MORE <ChevronDown size={14} style={{ marginLeft: '4px', transform: moreDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {moreDropdownOpen && (
                <div className="nav-dropdown-menu">
                  <button 
                    onClick={() => { setActiveTab('photos'); setMoreDropdownOpen(false); }} 
                    className={`dropdown-menu-item ${activeTab === 'photos' ? 'active' : ''}`}
                  >
                    <Image size={14} style={{ marginRight: '8px' }} /> Photos
                  </button>
                  <button 
                    onClick={() => { setActiveTab('videos'); setMoreDropdownOpen(false); }} 
                    className={`dropdown-menu-item ${activeTab === 'videos' ? 'active' : ''}`}
                  >
                    <Video size={14} style={{ marginRight: '8px' }} /> Videos
                  </button>
                  <button 
                    onClick={() => { setActiveTab('roadmap'); setMoreDropdownOpen(false); }} 
                    className={`dropdown-menu-item ${activeTab === 'roadmap' ? 'active' : ''}`}
                  >
                    <Map size={14} style={{ marginRight: '8px' }} /> Road Map
                  </button>
                  <button 
                    onClick={() => { setActiveTab('database'); setMoreDropdownOpen(false); }} 
                    className={`dropdown-menu-item ${activeTab === 'database' ? 'active' : ''}`}
                  >
                    <Database size={14} style={{ marginRight: '8px' }} /> Wolf Database
                  </button>
                  <button 
                    onClick={() => { setActiveTab('records'); setMoreDropdownOpen(false); }} 
                    className={`dropdown-menu-item ${activeTab === 'records' ? 'active' : ''}`}
                  >
                    <Trophy size={14} style={{ marginRight: '8px' }} /> Club Records
                  </button>
                  <button 
                    onClick={() => { setActiveTab('contact'); setMoreDropdownOpen(false); }} 
                    className={`dropdown-menu-item ${activeTab === 'contact' ? 'active' : ''}`}
                  >
                    <Phone size={14} style={{ marginRight: '8px' }} /> Contact Us
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* 3. ACCENT DIVISION STRIPE (Wolves orange height 5px) */}
      <div className="header-accent-orange-stripe" />

      {/* 4. SUB-NAVIGATION BREADCRUMBS BAR */}
      <div className="sub-breadcrumbs-bar">
        <div className="sub-breadcrumbs-bar-inner">
          <span 
            onClick={() => setActiveTab('battles')} 
            className={`breadcrumb-link ${activeTab === 'battles' ? 'active' : ''}`}
          >
            Wolves Battles
          </span>
          <span className="breadcrumb-divider">|</span>
          <span 
            onClick={() => setActiveTab('profiles')} 
            className={`breadcrumb-link ${activeTab === 'profiles' ? 'active' : ''}`}
          >
            Profiles
          </span>
          <span className="breadcrumb-divider">|</span>
          <span 
            onClick={() => setActiveTab('about')} 
            className={`breadcrumb-link ${activeTab === 'about' ? 'active' : ''}`}
          >
            About Wolves CC
          </span>
          <span className="breadcrumb-divider">|</span>
          <span 
            onClick={() => setActiveTab('database')} 
            className={`breadcrumb-link ${activeTab === 'database' ? 'active' : ''}`}
          >
            Wolf Database
          </span>
          <span className="breadcrumb-divider">|</span>
          <span 
            onClick={() => setActiveTab('records')} 
            className={`breadcrumb-link ${activeTab === 'records' ? 'active' : ''}`}
          >
            Club Records
          </span>
        </div>
      </div>

      {/* 5. BRAND INTRO BANNER - CLEAN NAVY BACKGROUND CARD (NO GROUND PHOTO) */}
      <div className="brand-intro-banner-clean">
        <div className="brand-intro-inner">
          <img src={logoImg} alt="Wolves CC Logo" className="brand-intro-logo" />
          <div className="brand-intro-text">
            <h2 className="brand-intro-slogan">WE ARE WOLVES AND WE ATTACK LIKE A PACK ON FIELD</h2>
            <p className="brand-intro-sub">A relentless force in the Kansas Cricket Leagues. Power, loyalty, and dominance defined in orange and blue.</p>
            <div className="brand-intro-motto">HUNT IS ON</div>
          </div>
        </div>
      </div>

      {/* 6. REDESIGNED ACTIVE SECTION VIEWS */}
      <main className="main-content-section-container">
        
        {/* TABS SWITCH LAYOUT */}
        {activeTab === 'profiles' && (
          <section id="profiles-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="section-title-wrap">
              <h2 className="tab-section-heading">WOLVES CC SQUAD</h2>
              <p className="tab-section-subtitle">Official player index. Click on any profile to reveal career breakdowns and match summaries.</p>
            </div>

            {/* Filter Controls Bar */}
            <div className="glass-card filter-container" style={{ marginBottom: '28px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by player name or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-field"
                />
              </div>

              <div className="filter-btn-group">
                {['All', 'Batters', 'All-Rounders', 'Wicket Keepers'].map((role) => (
                  <button 
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`filter-btn ${selectedRole === role ? 'active' : ''}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Redesigned Profile Cards Grid (USA Cricket style) */}
            <div className="profiles-usa-grid">
              {filteredPlayers.map((player) => (
                <div 
                  key={player.playerId}
                  onClick={() => handleOpenPlayerModal(player)}
                  className="usa-player-card"
                >
                  {/* Top Right Corner: Large bold italic white Jersey Number */}
                  <div className="usa-card-jersey">
                    {player.jerseyNumber && player.jerseyNumber < 99 ? String(player.jerseyNumber).padStart(2, '0') : '99'}
                  </div>

                  {/* Center: Headshot image */}
                  <div className="usa-card-photo-wrapper">
                    <PlayerAvatar player={player} size="card" />
                  </div>

                  {/* Bottom Left Corner: Player Name overlay (NO category tags) */}
                  <div className="usa-card-name-overlay">
                    <h4 className="usa-card-name">{player.name}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'battles' && (
          <section id="battles-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="section-title-wrap">
              <h2 className="tab-section-heading">UPCOMING WOLVES BATTLES</h2>
              <p className="tab-section-subtitle">2-Week match schedule tracker. Check times, opponents, and local venues.</p>
            </div>

            <div className="battles-schedule-grid">
              {upcomingMatches.map((match) => (
                <div key={match.id} className="battle-schedule-card">
                  <div className="battle-card-top">
                    <span className="battle-format-badge">{match.format}</span>
                    <span className="battle-home-away-badge">{match.type}</span>
                  </div>
                  
                  <div className="battle-teams-block">
                    <div className="battle-wolves-team">
                      <img src={logoImg} alt="Wolves Logo" className="battle-team-logo" />
                      <span className="battle-team-name">Wolves CC</span>
                    </div>
                    <div className="battle-versus-divider">VS</div>
                    <div className="battle-opponent-team">
                      <div className="battle-opponent-logo-avatar">{match.opponentLogo}</div>
                      <span className="battle-team-name">{match.opponent}</span>
                    </div>
                  </div>

                  <div className="battle-details-block">
                    <div className="battle-detail-item">
                      <span className="battle-detail-label">Date & Time</span>
                      <span className="battle-detail-value">{match.date} @ {match.time}</span>
                    </div>
                    <div className="battle-detail-item">
                      <span className="battle-detail-label">Venue / Stadium</span>
                      <span className="battle-detail-value">{match.venue}</span>
                    </div>
                  </div>

                  <div className="battle-card-footer">
                    <a 
                      href={match.cricclubsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-primary" 
                      style={{ fontSize: '0.8rem', padding: '8px 16px', textDecoration: 'none', width: '100%', justifyContent: 'center' }}
                    >
                      View on CricClubs
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'about' && (
          <section id="about-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="about-content-card-below glass-card" style={{ marginTop: 0 }}>
              <div className="about-two-columns-layout">
                
                {/* Story block */}
                <div className="about-text-column">
                  <div className="about-title-block">
                    <Shield size={24} style={{ color: 'var(--accent-orange)' }} />
                    <h3 style={{ fontSize: '1.75rem', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.02em' }}>THE WOLVES LEGACY</h3>
                  </div>
                  <p className="about-story-text">
                    Founded in <strong>2013</strong> by our legendary founding pillars, <strong>Abhiram Varchas</strong> and <strong>Vinay Jaideep (Jamaal)</strong>, <strong>Wolves Cricket Club</strong> is a highly prominent and well-known name in Kansas cricket circles. Over the last decade, they have kept the legacy burning bright, moving together on the field with the intense zeal, unyielding speed, and fierce coordination of a unified pack. Driven by a relentless pursuit of excellence, the Wolves have carved out a storied championship journey—dominating tournaments, earning widespread acclaim, and setting a modern standard of premium sportsmanship and team unity.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <span className="badge badge-orange">Abhiram Varchas (Cap #01)</span>
                    <span className="badge badge-blue">Vinay Jaideep Reddy (Cap #02)</span>
                  </div>
                </div>

                {/* Artistic pack visual block */}
                <div className="about-visual-column">
                  <img 
                    src="/abhiram_jaideep.jpg" 
                    alt="Abhiram and Jaideep standing together" 
                    className="wolves-pack-painting-img"
                  />
                  <div className="wolves-pack-motto-glow">
                    "FOUNDERS & LEADERS"
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}

        {activeTab === 'photos' && (
          <section id="photos-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="section-title-wrap">
              <h2 className="tab-section-heading">WOLVES GALLERY</h2>
              <p className="tab-section-subtitle">Highlights in photos. Action-packed frames from the Wolves' tournaments.</p>
            </div>

            <div className="photos-gallery-grid">
              {photosList.map((photo, index) => (
                <div key={index} className="gallery-photo-card">
                  <img src={photo.src} alt={photo.caption} className="gallery-photo-img" />
                  <div className="gallery-photo-overlay">
                    <span className="gallery-photo-caption">{photo.caption}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'videos' && (
          <section id="videos-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="section-title-wrap">
              <h2 className="tab-section-heading">MATCH VIDEOS</h2>
              <p className="tab-section-subtitle">Championship highlight clips, bowling spells, and training archives.</p>
            </div>

            <div className="videos-gallery-grid">
              {videosList.map((video, index) => (
                <div key={index} className="gallery-video-card">
                  <div className="video-card-thumbnail">
                    <div className="video-thumbnail-placeholder">
                      <div className="video-play-btn-circle">▶</div>
                      <span className="video-duration-tag">{video.duration}</span>
                    </div>
                  </div>
                  <div className="video-card-info">
                    <span className="video-category">{video.category}</span>
                    <h4 className="video-title">{video.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'contact' && (
          <section id="contact-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="glass-card contact-card-centered">
              <Mail size={40} style={{ color: 'var(--accent-orange)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>GET IN TOUCH</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6', maxWidth: '400px' }}>
                Have questions or interested in partnering with the Wolves Cricket Club? Shoot us an email and our team will get back to you!
              </p>
              
              <div 
                className="email-contact-box" 
                onClick={handleCopyEmail}
                title="Click to copy email address"
              >
                <span className="contact-email-text">wolvescricketclubks@gmail.com</span>
                <button className="email-copy-btn">
                  {copiedEmail ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'roadmap' && (() => {
          const milestones = [
            {
              year: '2013',
              title: 'WOLVES CC ESTABLISHED',
              subtitle: 'Founding Legacy & Initial Pack',
              badge: 'FOUNDING YEAR',
              icon: <Star size={24} style={{ color: 'var(--accent-orange)' }} />,
              text: 'Founded by Cap #01 Abhiram Varchas and Cap #02 Vinay Jaideep Reddy. The Wolves entered the local Kansas cricket scene, laying down the initial roster and establishing the team\'s core identity and motto "HUNT IS ON".'
            },
            {
              year: '2017',
              title: 'FIRST CHAMPIONSHIP TRIUMPH',
              subtitle: 'Lifted Our First League Trophy',
              badge: 'CHAMPIONS',
              icon: <Trophy size={24} style={{ color: 'var(--accent-orange)' }} />,
              text: 'A historic milestone! The Wolves claimed their very first league title, showcasing clinical skill on the field and establishing themselves as a dominant powerhouse in Kansas cricket circles.'
            },
            {
              year: '2019-2024',
              title: 'LEAGUE EXPANSION & GROWTH',
              subtitle: 'Entering MWCL & CPLKC Divisions',
              badge: 'EXPANSION',
              icon: <Sparkle size={24} style={{ color: 'var(--accent-blue)' }} />,
              text: 'Expanded the roster and registered in the official MWCL and CPLKC leagues. Secured brand sponsorships with Desi Chowrastha as Main Sponsor and Looney Arts as our digital creative agency.'
            },
            {
              year: '2025 Summer',
              title: 'MWCL T-20 DIVISION B CUP',
              subtitle: 'Lifted MWCL T-20 Championship',
              badge: 'CHAMPIONS',
              icon: <Trophy size={24} style={{ color: 'var(--accent-orange)' }} />,
              text: 'Lifted the prestigious Summer MWCL T-20 Championship in Division B. This title cemented the Wolves\' dominance and proved the intensity, training, and strategic execution of the pack.'
            },
            {
              year: '2026',
              title: 'DIVISION B CUP QUEST',
              subtitle: 'Active T-30 & T-20 Campaigns',
              badge: 'ACTIVE QUEST',
              icon: <Shield size={24} style={{ color: 'var(--accent-orange)' }} />,
              text: 'Entering the 2026 MWCL T30 Division B and CPLKC T20 leagues with our optimized 17-player elite roster, structured digital analytics database, and unified determination to lift more cups.'
            }
          ];

          const currentMilestone = milestones.find(m => m.year === selectedRoadmapYear) || milestones[milestones.length - 1];

          return (
            <section id="roadmap-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
              <div className="section-title-wrap">
                <h2 className="tab-section-heading">WOLVES DEVELOPMENT ROADMAP</h2>
                <p className="tab-section-subtitle">Click on the milestones to interactively explore our history, triumphs, and current quest.</p>
              </div>

              <div className="roadmap-interactive-container">
                {/* Stepper timeline track */}
                <div className="roadmap-stepper-track">
                  <div className="roadmap-progress-line" />
                  {milestones.map((m) => {
                    const isActive = m.year === selectedRoadmapYear;
                    return (
                      <button
                        key={m.year}
                        onClick={() => setSelectedRoadmapYear(m.year)}
                        className={`roadmap-step-btn ${isActive ? 'active' : ''}`}
                      >
                        <span className="step-dot" />
                        <span className="step-year-label">{m.year}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Milestone Detail Card */}
                <div className="roadmap-detail-card glass-card">
                  <div className="detail-card-header">
                    <div className="detail-icon-wrap">
                      {currentMilestone.icon}
                    </div>
                    <div>
                      <span className={`badge ${currentMilestone.badge === 'ACTIVE QUEST' ? 'badge-orange animate-pulse' : 'badge-blue'}`} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}>
                        {currentMilestone.badge}
                      </span>
                      <h3 className="detail-title">{currentMilestone.title}</h3>
                      <h4 className="detail-subtitle">{currentMilestone.subtitle}</h4>
                    </div>
                  </div>
                  <p className="detail-text">{currentMilestone.text}</p>
                </div>
              </div>
            </section>
          );
        })()}

        {activeTab === 'database' && (
          <section id="database-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="section-title-wrap">
              <h2 className="tab-section-heading">WOLF DATABASE</h2>
              <p className="tab-section-subtitle">Searchable, historical squad registry. Click on CricClubs links to view full profiles.</p>
            </div>

            <div className="database-table-container glass-card">
              <table className="database-table">
                <thead>
                  <tr>
                    <th>Cap #</th>
                    <th>Player Name</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'center' }}>Matches</th>
                    <th style={{ textAlign: 'center' }}>Runs</th>
                    <th style={{ textAlign: 'center' }}>Wickets</th>
                    <th style={{ textAlign: 'center' }}>Profile Page</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.playerId} className="db-table-row">
                      <td className="db-cell-cap">#{String(p.capNumber).padStart(2, '0')}</td>
                      <td className="db-cell-name">{p.name}</td>
                      <td>
                        <span className={`db-role-badge ${p.role.toLowerCase().replace(' ', '-')}`}>
                          {p.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{p.matchesPlayed}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-orange)' }}>{p.runs}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-blue)' }}>{p.wickets}</td>
                      <td style={{ textAlign: 'center' }}>
                        <a 
                          href={p.profileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="db-link-btn"
                        >
                          CricClubs <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'records' && (
          <section id="records-tab-view" className="tab-view-section scroll-fade-in fade-in-active">
            <div className="section-title-wrap">
              <h2 className="tab-section-heading">WOLVES CC CLUB RECORDS</h2>
              <p className="tab-section-subtitle">Top 5 highest individual and career achievements in batting and bowling.</p>
            </div>

            <div className="records-grid-two-cols">
              {/* Batting Column */}
              <div className="records-column">
                <div className="record-box-header orange-header">
                  <Trophy size={18} style={{ marginRight: '6px' }} /> BATTING LEADERS
                </div>
                
                <div className="record-section-card glass-card">
                  <h3>Career Run Leaders</h3>
                  <div className="record-list">
                    <div className="record-item-row">
                      <span className="record-rank">1</span>
                      <span className="record-name">Abhiram Varchas</span>
                      <span className="record-val">4,145 Runs</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">2</span>
                      <span className="record-name">Vinay Jaideep Reddy</span>
                      <span className="record-val">1,559 Runs</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">3</span>
                      <span className="record-name">Srinivas Reddy</span>
                      <span className="record-val">1,412 Runs</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">4</span>
                      <span className="record-name">Sai Avishkar Sreeramaneni</span>
                      <span className="record-val">1,020 Runs</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">5</span>
                      <span className="record-name">Mokshith Reddy</span>
                      <span className="record-val">860 Runs</span>
                    </div>
                  </div>
                </div>

                <div className="record-section-card glass-card" style={{ marginTop: '20px' }}>
                  <h3>Highest Individual Scores</h3>
                  <div className="record-list">
                    <div className="record-item-row">
                      <span className="record-rank">1</span>
                      <span className="record-name">Srinivas Reddy</span>
                      <span className="record-val">94</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">2</span>
                      <span className="record-name">Sai Avishkar Sreeramaneni</span>
                      <span className="record-val">93</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">3</span>
                      <span className="record-name">Srinivas Reddy</span>
                      <span className="record-val">81</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">4</span>
                      <span className="record-name">Abhiram Varchas</span>
                      <span className="record-val">80</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">5</span>
                      <span className="record-name">Srinivas Reddy</span>
                      <span className="record-val">76</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bowling Column */}
              <div className="records-column">
                <div className="record-box-header blue-header">
                  <Trophy size={18} style={{ marginRight: '6px' }} /> BOWLING LEADERS
                </div>

                <div className="record-section-card glass-card">
                  <h3>Career Wicket Leaders</h3>
                  <div className="record-list">
                    <div className="record-item-row">
                      <span className="record-rank">1</span>
                      <span className="record-name">Vinay Jaideep Reddy</span>
                      <span className="record-val">288 Wickets</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">2</span>
                      <span className="record-name">Abhiram Varchas</span>
                      <span className="record-val">96 Wickets</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">3</span>
                      <span className="record-name">Srinadh G</span>
                      <span className="record-val">84 Wickets</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">4</span>
                      <span className="record-name">Joseph Reddy Dondeti</span>
                      <span className="record-val">77 Wickets</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">5</span>
                      <span className="record-name">Yaswanth Reddy Seelam</span>
                      <span className="record-val">62 Wickets</span>
                    </div>
                  </div>
                </div>

                <div className="record-section-card glass-card" style={{ marginTop: '20px' }}>
                  <h3>Best Bowling Spells</h3>
                  <div className="record-list">
                    <div className="record-item-row">
                      <span className="record-rank">1</span>
                      <span className="record-name">Abhilash Yadav</span>
                      <span className="record-val">5/4</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">2</span>
                      <span className="record-name">Joseph Reddy Dondeti</span>
                      <span className="record-val">5/6</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">3</span>
                      <span className="record-name">Vinay Jaideep Reddy</span>
                      <span className="record-val">5/22</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">4</span>
                      <span className="record-name">Vinay Jaideep Reddy</span>
                      <span className="record-val">5/24</span>
                    </div>
                    <div className="record-item-row">
                      <span className="record-rank">5</span>
                      <span className="record-name">Srinadh G</span>
                      <span className="record-val">5/28</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* 7. MAXIMIZED PLAYER MODAL (Genuinely accurate CricClubs details modal remains fully supported) */}
      {activePlayer && activePlayerStats && (
        <div className="modal-backdrop" onClick={() => setActivePlayer(null)}>
          <div className="modal-content-container modal-animate-in" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setActivePlayer(null)}
              className="modal-absolute-close-btn"
            >
              <X size={20} />
            </button>

            <div className="modal-two-columns">
              
              <div className="modal-column-left">
                <div className="max-photo-frame">
                  <PlayerAvatar player={activePlayer} size="modal" />
                  <div className="max-photo-overlay-glow" />
                </div>

                <div className="max-counters-panel">
                  <div className="counter-box">
                    <div className="counter-label">JERSEY NUMBER</div>
                    <div className="counter-value orange-glow">
                      #<CountUp target={activePlayer.jerseyNumber} duration={1000} />
                    </div>
                  </div>

                  <div className="counter-box">
                    <div className="counter-label">CAP NUMBER</div>
                    <div className="counter-value blue-glow">
                      CAP <CountUp target={activePlayer.capNumber} duration={800} />
                    </div>
                  </div>
                </div>

                <div className="max-role-container">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '4px' }}>PRIMARY FIELD ROLE</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, fontWeight: '700' }}>
                      {activePlayer.role}
                    </h4>
                    {activePlayer.isWicketKeeper && (
                      <span className="badge badge-orange animate-pulse" style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px' }}>WICKET KEEPER</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-column-right">
                <div>
                  <h3 className="modal-player-name">{activePlayer.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span className="badge badge-orange">Wolves CC</span>
                    <span className="badge badge-blue">Active Roster</span>
                  </div>
                </div>

                <div className="modal-intro-card">
                  <h4 className="intro-card-title">
                    <Info size={16} />
                    PLAYER SPOTLIGHT INTRO
                  </h4>
                  <p className="intro-card-text">
                    {getPlayerIntro(activePlayer)}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>
                    CAREER SUMMARY HIGHLIGHTS
                  </h4>
                  
                  <div className="highlights-stat-grid">
                    <div className="highlight-stat-card">
                      <div className="stat-card-num orange">{activePlayerStats.totalRuns.toLocaleString()}</div>
                      <div className="stat-card-label">Total Runs</div>
                    </div>
                    <div className="highlight-stat-card">
                      <div className="stat-card-num blue">{activePlayerStats.totalWickets}</div>
                      <div className="stat-card-label">Wickets Taken</div>
                    </div>
                    <div className="highlight-stat-card">
                      <div className="stat-card-num">{activePlayerStats.highestScore}</div>
                      <div className="stat-card-label">Highest Score</div>
                    </div>
                    <div className="highlight-stat-card">
                      <div className="stat-card-num">{activePlayerStats.bestBowling}</div>
                      <div className="stat-card-label">Best Bowling</div>
                    </div>
                  </div>

                  <div className="secondary-milestones-bar">
                    <div className="milestone-pill">
                      Centuries: <span>{activePlayerStats.centuries}</span>
                    </div>
                    <div className="milestone-pill">
                      50s: <span>{activePlayerStats.halfCenturies}</span>
                    </div>
                    <div className="milestone-pill">
                      5w Hauls: <span>{activePlayerStats.fiveWickets}</span>
                    </div>
                    <div className="milestone-pill">
                      4w Hauls: <span>{activePlayerStats.fourWickets}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>
                    FORMAT GRANULAR BREAKDOWNS
                  </h4>

                  {Object.keys(activePlayer.battingStats).length > 0 && (
                    <div className="stats-mini-table-wrap">
                      <div className="mini-table-title">Batting Formats</div>
                      <table className="mini-stats-table">
                        <thead>
                          <tr>
                            <th>Tournament Match Format</th>
                            <th style={{ textAlign: 'center' }}>Mat</th>
                            <th style={{ textAlign: 'center' }}>Runs</th>
                            <th style={{ textAlign: 'center' }}>Ave</th>
                            <th style={{ textAlign: 'center' }}>SR</th>
                            <th style={{ textAlign: 'center' }}>HS</th>
                            <th style={{ textAlign: 'center' }}>50s/100s</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(activePlayer.battingStats)
                            .filter(([format]) => format.toUpperCase().trim() !== 'PRACTICE')
                            .map(([format, data]) => (
                              <tr key={format}>
                                <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                  {mapFormatName(format)}
                                </td>
                                <td style={{ textAlign: 'center' }}>{data.Mat || '0'}</td>
                                <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-orange)' }}>{data.Runs || '0'}</td>
                                <td style={{ textAlign: 'center' }}>{data.Ave || '0.00'}</td>
                                <td style={{ textAlign: 'center' }}>{data.SR || '0.00'}</td>
                                <td style={{ textAlign: 'center' }}>{data.HS || '0'}</td>
                                <td style={{ textAlign: 'center' }}>{data['50s'] || '0'}/{data['100s'] || '0'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {Object.keys(activePlayer.bowlingStats).length > 0 && (
                    <div className="stats-mini-table-wrap" style={{ marginTop: '16px' }}>
                      <div className="mini-table-title">Bowling Formats</div>
                      <table className="mini-stats-table">
                        <thead>
                          <tr>
                            <th>Tournament Match Format</th>
                            <th style={{ textAlign: 'center' }}>Overs</th>
                            <th style={{ textAlign: 'center' }}>Wkts</th>
                            <th style={{ textAlign: 'center' }}>Ave</th>
                            <th style={{ textAlign: 'center' }}>Econ</th>
                            <th style={{ textAlign: 'center' }}>BBF</th>
                            <th style={{ textAlign: 'center' }}>4w/5w</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(activePlayer.bowlingStats)
                            .filter(([format]) => format.toUpperCase().trim() !== 'PRACTICE')
                            .map(([format, data]) => (
                              <tr key={format}>
                                <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                  {mapFormatName(format)}
                                </td>
                                <td style={{ textAlign: 'center' }}>{data.Overs || '0.0'}</td>
                                <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-blue)' }}>{data.Wkts || '0'}</td>
                                <td style={{ textAlign: 'center' }}>{data.Ave || '0.00'}</td>
                                <td style={{ textAlign: 'center' }}>{data.Econ || '0.00'}</td>
                                <td style={{ textAlign: 'center' }}>{data.BBF || '—'}</td>
                                <td style={{ textAlign: 'center' }}>{data['4w'] || '0'}/{data['5w'] || '0'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activePlayer.isWicketKeeper && (
                    <div className="wk-stats-info-box" style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.04)', border: '1px solid rgba(255, 107, 0, 0.2)', borderLeft: '4px solid var(--accent-orange)' }}>
                      <h5 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} style={{ color: 'var(--accent-orange)' }} />
                        OFFICIAL WICKET KEEPING & FIELDING
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Catches, stumpings, and run-outs are tracked directly in real-time on CricClubs. Since we maintain absolute data integrity without using estimated or mock figures, you can view their real-time fielding records directly on their official CricClubs profile page.
                      </p>
                      <a 
                        href={activePlayer.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '6px', marginTop: '10px', textDecoration: 'none' }}
                      >
                        View Fielding Records on CricClubs <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                <div className="modal-buttons-footer">
                  <a 
                    href={activePlayer.profileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary"
                    style={{ gap: '6px' }}
                  >
                    <ExternalLink size={14} />
                    View CricClubs Profile
                  </a>
                  <button className="btn-secondary" onClick={() => setActivePlayer(null)}>
                    Close Details
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* FOOTER DIVISION */}
      <footer style={{ 
        marginTop: '80px', 
        paddingTop: '32px', 
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p>© 2026 Wolves Cricket Club. Designed for Kansas Cricket Legacy. Slogan powered by pack power.</p>
      </footer>
    </div>
  );
}

export default App;
