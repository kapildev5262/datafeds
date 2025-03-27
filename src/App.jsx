import MultiChainPriceFeed from "./datafeeds/MultiChainPriceFeed";

import Dexes from "./Dexes/Dexes";
import './App.css';

function App() {
  return (
    <div className="App">
        {/* <MultiChainPriceFeed /> */}
        <Dexes></Dexes>
    </div>
  );
}

export default App;
