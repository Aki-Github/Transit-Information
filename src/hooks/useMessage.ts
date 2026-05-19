import { useCallback } from "react";
import { toaster } from "../components/ui/toaster";

type Props = {
    title: string;
    type: "info" | "success" | "error" | "warning";
};

export const useMessage = () => {

    const showMessage = useCallback((props: Props) => {
        const { title, type } = props;

        toaster.create({
            title,
            type,
            duration: 3000,
        });
    }, []);

    return { showMessage };
};