import * as React from "react";
import { Select } from "radix-ui";
import classnames from "classnames";
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "@radix-ui/react-icons";

export default function SelectDemo({ options, label, onChange }) {
    const [selectedOption, setSelectedOption] = useState(null);

    return (
        <Select.Root
            value={selectedOption}
            onValueChange={(value) => {
                setSelectedOption(value);
                onChange(value);
            }}
        >
            <Select.Trigger
                className="inline-flex h-[35px] w-full items-center justify-between rounded bg-white px-3 text-sm shadow-sm ring-1 ring-gray-300 focus:ring-2"
            >
                <Select.Value placeholder={label} />
                <Select.Icon>
                    <ChevronDownIcon />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content className="rounded-md bg-white shadow-md">
                    <Select.ScrollUpButton className="flex items-center justify-center h-6 text-gray-600">
                        <ChevronUpIcon />
                    </Select.ScrollUpButton>
                    <Select.Viewport className="p-2">
                        <Select.Group>
                            {options.map((item, index) => (
                                <SelectItem value={item.value} key={index}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </Select.Group>
                    </Select.Viewport>
                    <Select.ScrollDownButton className="flex items-center justify-center h-6 text-gray-600">
                        <ChevronDownIcon />
                    </Select.ScrollDownButton>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}

const SelectItem = React.forwardRef(({ children, className, ...props }, ref) => (
    <Select.Item
        className={classnames(
            "relative flex h-8 select-none items-center rounded px-3 text-sm hover:bg-gray-100",
            className
        )}
        {...props}
        ref={ref}
    >
        <Select.ItemText>{children}</Select.ItemText>
        <Select.ItemIndicator className="absolute left-2">
            <CheckIcon />
        </Select.ItemIndicator>
    </Select.Item>
));

SelectItem.displayName = "SelectItem";
