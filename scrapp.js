const puppeteer = require("puppeteer");

const getTimetable = async (login, password, semester) => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('https://edziekanat.zut.edu.pl/WU/Logowanie2.aspx');

    const loginSelector =    "#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_txtIdent";
    const passSelector =     "#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_txtHaslo";
    const loginBtnSelector = "#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_butLoguj";
    const semBtnSelector =   "#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_rbJak_2";
    const menuSelector =     "#ctl00_ctl00_TopMenuPlaceHolder_wumasterMenuTop_menuTop"
    const nextSelector =     "#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_butN"

    await page.waitForSelector(loginSelector);
    await page.type(loginSelector, login, {delay: 50});
    await page.type(passSelector, password, {delay: 50});
    await page.click(loginBtnSelector);
    await page.waitForSelector(menuSelector);
    await page.goto("https://edziekanat.zut.edu.pl/WU/PodzGodzin.aspx");
    await page.waitForSelector(semBtnSelector);
    await page.click(semBtnSelector);
    await page.waitForNetworkIdle();

    if (semester === 80) {
        await page.click(nextSelector);
        await page.waitForSelector(semBtnSelector);
        await page.waitForNetworkIdle();
    }


    const timetable = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('.gridDane'));
        let trsObjects = [];
        trs.map(tr => {

            const getCell = (id) => {
                return tr.cells[id].innerText;
            }

            let year =          getCell(0).substring(6, 10);
            let month =         getCell(0).split(".")[1];
            let day =           getCell(0).split(".")[0];
            let startHour =     getCell(1).split(":")[0];
            let startMinute =   getCell(1).split(":")[1];
            let endHour =       getCell(2).split(":")[0];
            let endMinute =     getCell(2).split(":")[1];

            const startDate =   `${year}-${month}-${day}T${startHour}:${startMinute}:00`;
            const endDate =     `${year}-${month}-${day}T${endHour}:${endMinute}:00`;

            let tempObject = {
                start:          {dateTime: startDate, timeZone: 'Europe/Warsaw'},
                end:            {dateTime: endDate, timeZone: 'Europe/Warsaw'},
                summary:        getCell(5) + " " + getCell(4),
                location:       getCell(3),
                description:    getCell(6) + "\n" + getCell(9),
            }

            trsObjects.push(tempObject);
        })
        return trsObjects;
    }).catch(err => console.log(err));

    await page.goto("https://edziekanat.zut.edu.pl/WU/Wyloguj.aspx");
    await browser.close();

    // tablica obiektów ze szczegółami wpisów w planie zajęć
    return timetable;
}

// getTimetable()
//     .then(timetable => {
//             console.log(timetable);
//     });


module.exports = getTimetable

