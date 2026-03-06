import './globals.css';

export const metadata = {
    title: 'OptiWatt — Campus Energy Management System',
    description: 'Monitor and optimize campus energy consumption',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
