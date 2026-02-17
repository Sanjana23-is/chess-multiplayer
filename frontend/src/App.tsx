//import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Landing } from './screens/Landing';
import { Game } from './screens/Game';

function App() {

  return (
    <div className='h-screen bg-neutral-800'>
      <BrowserRouter>
      <Routes>
        <Route path="/" element = {<Landing/> } /> 
        <Route path="/game" element = {<Game/> } /> 
      </Routes>
    </BrowserRouter> 
   </div>
  )
}

export default App
