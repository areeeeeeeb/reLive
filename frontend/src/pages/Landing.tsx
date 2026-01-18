'use client'

import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { motion } from "framer-motion"

const Landing: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="w-full h-full xs:text-2xl text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-5xl flex flex-col items-start justify-center font-overusedGrotesk p-10 md:p-16 lg:p-24 text-chartreuse tracking-wide uppercase">
      <VerticalCutReveal
        splitBy="characters"
        staggerDuration={0.025}
        staggerFrom="first"
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 21,
        }}
      >
        {`FANS 📱 RECORD`}
      </VerticalCutReveal>
      <VerticalCutReveal
        splitBy="characters"
        staggerDuration={0.025}
        staggerFrom="last"
        reverse={true}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 21,
          delay: 0.5,
        }}
      >
        {`WE 🔗 CONNECT`}
      </VerticalCutReveal>
      <VerticalCutReveal
        splitBy="characters"
        staggerDuration={0.025}
        staggerFrom="center"
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 21,
          delay: 1.1,
        }}
      >
        {`ALL ✨ RELIVE`}
      </VerticalCutReveal>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 21,
          delay: 1.8,
        }}
        className="mt-8"
      >
        <Button
          onClick={login}
          className="bg-chartreuse hover:bg-chartreuse/90 text-black font-bold text-lg px-6 py-4 sm:px-8 sm:py-6 rounded-full uppercase tracking-wide"
        >
          JUMP IN!
        </Button>
      </motion.div>
    </div>
  )
}

export default Landing;
