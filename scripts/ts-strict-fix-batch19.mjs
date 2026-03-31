import { readFileSync as R, writeFileSync as W } from "fs";
const B = "/Users/claudewilliams/Desktop/NOLTCsignup/src";
function fix(p, fn) { W(p, fn(R(p, "utf8"))); console.log("Fixed:", p.split("/src/")[1]||p.split("/").pop()); }
fix(B+"/registration/ui/timeout/useSessionTimeout.ts", c => c.split("{ currentScreen, setLastActivity, showAlertMessage, onTimeout }) {").join("{ currentScreen, setLastActivity, showAlertMessage, onTimeout }: { currentScreen: string; setLastActivity: (ts: number) => void; showAlertMessage: (msg: string) => void; onTimeout: () => void; }) {").split("const timeoutTimerRef = useRef(null);").join("const timeoutTimerRef = useRef(null as number|null);").split("const warningTimerRef = useRef(null);").join("const warningTimerRef = useRef(null as number|null);"));
console.log("done");
