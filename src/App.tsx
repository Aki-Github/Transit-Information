import './App.css';
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";

import { system } from "./theme/theme"; 
import { Router } from "./router/Router";
import { Toaster } from "./components/ui/toaster";
import { LoginUserProvider } from './providers/LoginUserProvider';

function App() {
  return (
    <ChakraProvider value={system}>
      <LoginUserProvider>
        <BrowserRouter>
          <Router />
          <Toaster />
        </BrowserRouter>
      </LoginUserProvider>
    </ChakraProvider>
  );
}

export default App;