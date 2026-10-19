import * as React from "react";
const GmailIcon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        {...props}
    >
        <path
            d="M22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.1H5.827L5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91C6.71 7.31 9.14 5.38 12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.36 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.07C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.93V16.94C3.99 20.53 7.7 23 12 23C14.97 23 17.46 22.02 19.28 20.34C21.36 18.42 22.56 15.6 22.56 12.25C22.56 11.47 22.49 10.72 22.36 10Z"
            fill="#FC4C53"
        />
        <mask
            id="mask0_158_309"
            style={{
                maskType: "luminance",
            }}
            maskUnits="userSpaceOnUse"
            x={1}
            y={1}
            width={22}
            height={22}
        >
            <path
                d="M22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.1H5.827L5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91C6.71 7.31 9.14 5.38 12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.36 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.07C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.93V16.94C3.99 20.53 7.7 23 12 23C14.97 23 17.46 22.02 19.28 20.34C21.36 18.42 22.56 15.6 22.56 12.25C22.56 11.47 22.49 10.72 22.36 10Z"
                fill="white"
            />
        </mask>
        <g mask="url(#mask0_158_309)">
            <path
                d="M3.64611 24.041C7.92908 24.041 11.4011 19.3539 11.4011 13.572C11.4011 7.79016 7.92908 3.10303 3.64611 3.10303C-0.636855 3.10303 -4.10889 7.79016 -4.10889 13.572C-4.10889 19.3539 -0.636855 24.041 3.64611 24.041Z"
                fill="url(#paint0_radial_158_309)"
            />
            <path
                d="M17.0211 34.6619C25.6608 33.5827 32.0006 27.3923 31.1815 20.8351C30.3625 14.278 22.6947 9.83726 14.0551 10.9164C5.41542 11.9956 -0.924401 18.1861 -0.105343 24.7432C0.713715 31.3003 8.3815 35.7411 17.0211 34.6619Z"
                fill="url(#paint1_radial_158_309)"
            />
            <path
                d="M11.1052 8.28003L11.5962 13.876L12.2192 17.623L19.5812 24.471L28.1882 8.57403L11.1052 8.28003Z"
                fill="url(#paint2_linear_158_309)"
            />
        </g>
        <defs>
            <radialGradient
                id="paint0_radial_158_309"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(3.64705 13.5718) scale(7.7549 10.468)"
            >
                <stop offset={0.368} stopColor="#FFCF09" />
                <stop offset={0.718} stopColor="#FFCF09" stopOpacity={0.7} />
                <stop offset={1} stopColor="#FFCF09" stopOpacity={0} />
            </radialGradient>
            <radialGradient
                id="paint1_radial_158_309"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(15.5384 22.7892) rotate(-7.12) scale(15.7645 11.9647)"
            >
                <stop offset={0.383} stopColor="#34A853" />
                <stop offset={0.706} stopColor="#34A853" stopOpacity={0.7} />
                <stop offset={1} stopColor="#34A853" stopOpacity={0} />
            </radialGradient>
            <linearGradient
                id="paint2_linear_158_309"
                x1={23.5582}
                y1={6.28603}
                x2={12.1482}
                y2={20.299}
                gradientUnits="userSpaceOnUse"
            >
                <stop offset={0.671} stopColor="#4285F4" />
                <stop offset={0.885} stopColor="#4285F4" stopOpacity={0} />
            </linearGradient>
        </defs>
    </svg>
);
export default GmailIcon;
