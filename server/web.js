import options from "./index";
import Server from "./server";

const { connector, app } = options;

connector.setupApp(app);

connector.startApp(Server(options));
