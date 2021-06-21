## Before all
`npm i`

## Compile contracts 
`npx harhat compile`

## Test
`npx hardhat test`

## Test deploy
First terminal: 
`npx hardhat node`

 Second terminal: 
`npx hardhat run --network localhost scripts/deploy.js`


## Запуск тестового фронт с бэком

Перед первым запуском выполнить команду `npm i` (затем нет необходимости).

### Запуск бэкенда
- Запустить форк мейннета:
  ```
  npx hardhat node
  ```
- Открыть новое окно консоли
- Задеплоить контракты на форк: 
  ```
  npx hardhat run --network localhost scripts/deploy.ts
  ```
- Пополнить тестовый кошелек токенами: 
  ```
  npx hardhat run --network localhost scripts/fillTestWallets.ts
  ```


### Запуск фронтенда

- Открыть проект фронтенда в отдельном окне
- Скопировать содержимое файла `frontend/constants.ts` с бэкенда в файл `constants/index.ts` фронтенда
- Скопировать приватный ключ тестового аккаунта из файла бэкенда `utils/testPrivateKeys.ts` - первый в списке
- Открыть в браузере расширение Metamask
- Переключиться в нём на тестовую сеть (кнопка сверху, где обычно написано Ethereum mainnet) `localhost:8545`
- Открыть меню аккаунтов справа наверху, и нажать **Import account**
- Импортировать тестовый аккаунт, вставив скопированный ранее приватный ключ (вставлять без символов `'`)
- Запустить фронтенд, выполнив в консоли проекта фронтенда: `npm run dev`
- Открыть https://localhost:3000/app
- Нажать Connect account в правом верхнем углу