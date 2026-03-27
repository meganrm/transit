import { Header } from "./components/Header";
import { MapView } from "./components/MapView";

function App() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
            }}
        >
            <Header />
            <MapView />
        </div>
    );
}

export default App;
