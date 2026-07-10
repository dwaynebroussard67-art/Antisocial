import Link from "next/link";
import styles from "./signal.module.css";

type Room = {
  id: string;
  name: string;
  slug: string;
  type: string;
  trustFloor: string;
  updatedAt: Date | string;
};

export function RoomList({ rooms }: { rooms: Room[] }) {
  if (rooms.length === 0) {
    return <div className={styles.empty}>No rooms yet. Create one with purpose, not noise.</div>;
  }
  return (
    <>
      {rooms.map((room) => (
        <Link key={room.id} href={`/signal/rooms/${room.id}`} className={styles.cardLink}>
          <div className={styles.rowBetween}>
            <div>
              <div className={styles.roomName}>{room.name}</div>
              <div className={styles.meta}>
                {room.type} • {room.trustFloor}
              </div>
            </div>
            <div className={styles.dim}>{new Date(room.updatedAt).toLocaleString()}</div>
          </div>
        </Link>
      ))}
    </>
  );
}
