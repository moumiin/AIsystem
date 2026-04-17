// App.jsx
import React from 'react';
import './App.css';  // CSS 파일 import
import OnSign from './OnSign';
import Line from './Line';
import Home from './Home';
import Logout from './Logout';
import LearningStatus from './LearningStatus';
import Leval from './Leval';
import Reward from './Reward';
import Step from './Step';
import FirstWord from './FirstWord';
import RecentActivity from './RecentActivity';
import WeeklyGoal from './WeeklyGoal';

const App = () => {
  return (
    <div className="Desktop">
      <OnSign />
      <Line />
      <Home />
      <Logout />
      <LearningStatus />
      <Leval />
      <Reward />
      <Step />
      <FirstWord />
      <RecentActivity />
      <WeeklyGoal />
    </div>
  );
};

export default App;