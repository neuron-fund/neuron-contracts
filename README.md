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

Перед первым запуском выполнить команду `npm i` потом уже не надо.

### Запуск бэка
- Запустить форк мейннета:
  ```
  npx hardhat node
  ```
- Открыть новое окно консоли
- Задеплоить наши контракты на форк: 
  ```
  npx hardhat run --network localhost scripts/deploy.ts
  ```
- Пополнить тестовый кошелек токенами: 
  ```
  npx hardhat run --network localhost scripts/fillTestWallets.ts
  ```


### Запуск фронта

- Открыть проект фронта в отдельном окне
- Скопировать содержимое файла `frontend/constants.ts` с бэка в файл `constants/index.ts` фронта
- Скопировать приватный ключ тестового акка из файла бэка `utils/testPrivateKeys.ts` - первый в списке
- Открыть в браузере расширение Metamask
- Переключиться там на тестовую сеть (кнопка сверху, где обычно написано ethereum mainnet) `localhost 8545`
- Открыть меню аккаунтов справа наверху и нажать **Import account**
- Импортировать тестовый аккаунт вставив скопированный ранее приватный ключ (вставлять без символов `'`)
- Запустить фронт, выполнив в консоли проекта фронта: `npm run dev`
- Открыть https://localhost:3000/app
- Нажать connect account в правом верхнем углу