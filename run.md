# setup database
node scripts/dropDatabase.js
node migrations/index.js

<!-- run code -->

# backend
npm install
npm run start

# frontend

yarn install
cd android && ./gradlew clean
cd ..
yarn start --reset-cache
yarn android