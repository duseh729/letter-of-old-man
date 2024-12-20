import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Main from "../pages/Main";
import ChatBot from "../components/ChatBot";
import ChildMain from "../pages/ChildMain";
import Report from "../pages/Report";
import ChatLog from "../pages/ChatLog";
import ChildRecord from "../pages/ChildRecord";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Main />,
    },
    {
      path: "/chat",
      element: <ChatBot />,
    },
    {
      path: "/child",
      element: <ChildMain />
    },
    {
      path: "/child/report",
      element: <Report />
    },
    {
      path: "/child/chat-log",
      element: <ChatLog />
    },
    {
      path: "/child/record",
      element: <ChildRecord />
    }
  ],
  {
    basename: "/proxy/3000", // 이 부분으로 경로에 prefix를 추가
  }
);

function Router() {
  return <RouterProvider router={router} />;
}

export default Router;
