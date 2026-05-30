import styles from './ProfileCardSkeleton.module.css'

function Bone({ width, height, radius = 8, style }) {
  return (
    <div
      className={styles.bone}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

function SkeletonCard() {
  return (
    <div className={styles.card}>
      {/* Top row */}
      <div className={styles.topRow}>
        <Bone width={48} height={48} radius={9999} />
        <div className={styles.identity}>
          <Bone width="60%" height={16} />
          <Bone width="40%" height={12} style={{ marginTop: 6 }} />
          <Bone width="50%" height={10} style={{ marginTop: 6 }} />
        </div>
      </div>

      {/* Chips */}
      <div className={styles.chipsRow}>
        <Bone width={90}  height={24} radius={9999} />
        <Bone width={110} height={24} radius={9999} />
        <Bone width={70}  height={24} radius={9999} />
      </div>

      {/* Exp chip */}
      <Bone width={120} height={24} radius={9999} />

      {/* Compat bar */}
      <div className={styles.compatSection}>
        <div className={styles.compatHeader}>
          <Bone width={80}  height={10} />
          <Bone width={30}  height={10} />
        </div>
        <Bone width="100%" height={6} radius={9999} />
      </div>

      {/* Member since */}
      <Bone width={120} height={10} />

      {/* Button */}
      <Bone width="100%" height={44} radius={12} />
    </div>
  )
}

export default function ProfileCardSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </>
  )
}
