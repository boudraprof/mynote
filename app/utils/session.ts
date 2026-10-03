import { headers } from "next/headers";
import { auth } from "./auth";

export const getServerSession = async (reqHeaders?: Headers) => {
  if (reqHeaders) {
    return await auth.api.getSession({ headers: reqHeaders });
  }

  const headerList: Headers = await headers();
  return await auth.api.getSession({ headers: headerList  });
};
