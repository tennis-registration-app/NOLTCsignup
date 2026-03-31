c = open("src/registration/appHandlers/handlers/groupHandlers.ts").read()
idx = c.find("export function useGroupHandlers")
typedef = """interface Player {
  id: unknown;
  name: string;
  memberNumber?: string;
  memberId?: unknown;
  phone?: string;
  ranking?: number | null;
  winRate?: number;
  accountId?: unknown;
}

type AnyFn = (...args: unknown[]) => unknown;

interface UseGroupHandlersDeps {
  [key: string]: unknown;
}
"""
c = c[:idx] + typedef + c[idx:]
c = c.replace("  CONSTANTS,\n}) {", "  CONSTANTS,\n}: UseGroupHandlersDeps) {")
c = c.replace("    (playerId) => {", "    (playerId: unknown) => {")
c = c.replace("    (player) => {", "    (player: Player) => {")
c = c.replace("  const sameGroup = useCallback((a = [], b = []) => {", "  const sameGroup = useCallback((a: Player[] = [], b: Player[] = []) => {")
c = c.replace("  const norm = (p) => {", "  const norm = (p: Player) => {")
open("src/registration/appHandlers/handlers/groupHandlers.ts", "w").write(c)
print("done")