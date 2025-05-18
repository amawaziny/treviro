# **App Name**: Treviro

## Core Features:

- Google Authentication: Enable users to log in securely using their Google account.
- Investment Type Input: Allow users to add different investment types, focusing initially on Real Estate, Gold (physical and funds), Stocks (individual and funds), Debt Instruments, and Currencies.
- Dashboard Overview: Provide a dashboard displaying the distribution of investments across different asset classes.
- Stock Transaction Logging: Enable tracking of stock purchases and sales.
- Currency Rate Integration: Connect to a service (such as exchangerate-api.com) which can provide current exchange rates. Use a reasoning tool that decides, for each transaction, whether the current exchange rate is different than the historical exchange rate (as a method of drawing the user's attention to currency fluctuation).
- Dark Mode Support: Support for dark mode.

## Style Guidelines:

- Primary color: Strong blue (#3498DB) to convey trust and stability, inspired by traditional finance but modernized.
- Background color: Light gray (#F2F4F7), almost white, to ensure readability and a clean interface. Dark mode will invert these colors.
- Accent color: Green (#2ECC71) is used to highlight gains and positive returns, providing an optimistic feel. Avoid the cliched and predictable use of green in the primary palette.
- Clean and modern sans-serif fonts should be used consistently throughout the app. Material UI for React Native compatible fonts.
- Use a set of minimalist, professional icons. Material UI icons.
- Maintain a clean and intuitive layout, which prominently displays key financial metrics. Optimize the display for clarity. Follow Material UI layout guidelines.