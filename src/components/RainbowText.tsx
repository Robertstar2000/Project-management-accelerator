import React from 'react';

export const RainbowText = ({ text }) => {
    const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF4500', '#00FF7F', '#1E90FF'];
    return (
        <b style={{ fontWeight: 'bold' }}>
            {text.split('').map((char, index) => (
                <span key={index} style={{ color: colors[index % colors.length] }}>
                    {char}
                </span>
            ))}
        </b>
    );
};
