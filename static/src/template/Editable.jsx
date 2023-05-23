import React, { useState } from "react";

// BUG editing bar is not wrapped to the sidebar
// From https://github.com/learnwithparam/logrocket-inline-edit-ui//
// https://blog.logrocket.com/building-inline-editable-ui-in-react/
const Editable = ({
    text,
    type,
    placeholder,
    children,
    ...props
}) => {

    const [isEditing, setEditing] = useState(false);

    // Event handler while pressing any key while editing
    const handleKeyDown = (e) => {
        const keys = ["Escape", "Tab", "Enter"];
        if (e in keys) {
            setEditing(false);
        }
    };

    return (
        <section {...props}>
            {isEditing ? (
                <div
                    onBlur={() => setEditing(false)}
                    onKeyDown={e => handleKeyDown(e)}
                >
                    {children}

                </div>
            ) : (
                <div
                    onClick={() => setEditing(true)}
                >
                    <span className={`${text ? "text-black" : "text-gray-500"}`}>
                        {text || placeholder || "___"}
                    </span>
                </div>
            )}
        </section>
    );
};

export default Editable;