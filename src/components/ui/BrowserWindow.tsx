import React from "react";
import { Lock, RefreshCw, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrowserWindowProps {
    url?: string;
    children: React.ReactNode;
    className?: string;
}

export function BrowserWindow({ url = "https://gerencia.global", children, className }: BrowserWindowProps) {
    return (
        <div className={cn("overflow-hidden rounded-xl border bg-background shadow-2xl", className)}>
            {/* Browser Toolbar */}
            <div className="flex h-10 items-center gap-4 border-b bg-muted/40 px-4">
                {/* Traffic Lights */}
                <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[#FF5F57] shadow-sm ring-1 ring-black/5" />
                    <div className="h-3 w-3 rounded-full bg-[#FEBC2E] shadow-sm ring-1 ring-black/5" />
                    <div className="h-3 w-3 rounded-full bg-[#28C840] shadow-sm ring-1 ring-black/5" />
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-2 text-muted-foreground/50">
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4" />
                    <RefreshCw className="h-3.5 w-3.5" />
                </div>

                {/* Address Bar */}
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex h-6 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-background px-3 text-xs text-muted-foreground shadow-sm ring-1 ring-muted">
                        <Lock className="h-3 w-3 text-emerald-500" />
                        <span className="truncate max-w-[200px]">{url}</span>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
            </div>

            {/* Content Area */}
            <div className="relative min-h-[300px] bg-background">
                {children}
            </div>
        </div>
    );
}
