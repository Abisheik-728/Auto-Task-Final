import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

const AnimatedCard = ({ children, className, delay = 0, hover = true }: AnimatedCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: "easeOut" }}
    whileHover={hover ? { y: -2, boxShadow: "0 8px 30px -12px hsl(var(--primary) / 0.15)" } : undefined}
    className="rounded-[var(--radius)]"
  >
    <Card className={cn("transition-colors duration-200", className)}>
      {children}
    </Card>
  </motion.div>
);

export default AnimatedCard;
