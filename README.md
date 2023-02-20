# Enqueue
Det här är ett elektroniskt kösystem för att hantera handledning och redovisning i undervisningen på KTH. Det började som ett projekt i kursen Internetprogrammering (DD1389). Vi som har gjort kösystemet är Martin Pola och Sandra Järkeborn.

# Systemkrav
- Node
- MariaDB (eller MySQL)

# Installation
1. Se till att installera Node, NPM och MariaDB på din dator. På Ubuntu kan du använda paketen `nodejs`, `npm` och `mariadb-server`.
```
# apt update
# apt install nodejs npm mariadb-server
# mysql_secure_installation
```
2. Skapa en databas och ett användarkonto i MariaDB-servern. Ge användarkontot läs- och skrivrättigheter till databasen.
3. Importera filen `structure.sql` till databasen. Det kan göras så här:
```
$ mysql -u <användarnamn> -h localhost -p <databasnamn> < structure.sql
```
4. Kopiera `backend/config.example.js` till `backend/config.js` och fyll i uppgifterna för att ansluta till MariaDB-servern och välja databas.

## Inloggning med KTH-konto
För att kunna logga in med ett KTH-konto behöver du värden för `kthlogin.clientId` och `kthlogin.clientSecret`. De kan du förmodligen få från it-avdelningen om du frågar snällt. Här kan du läsa mer om det:  
https://intra.kth.se/it/natverk/identitetshantering/registrering-av-webbapplikation-1.1029276

# Körning
Kör frontenden och backenden parallellt, förslagsvis i två separata terminalemulatorsfönster:
```
$ cd backend && npm start
$ cd frontend && npm start
```
När de är igång bör du kunna nå frontenden i din webbläsare:
http://localhost:8080
