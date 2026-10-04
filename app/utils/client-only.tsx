import "client-only";

import { usePathname } from "next/navigation";

export const useMatchPath = (path: string): boolean => usePathname().split("/").includes(path)