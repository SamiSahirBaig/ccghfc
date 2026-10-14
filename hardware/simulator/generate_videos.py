import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio

OUTPUT_DIR = r"c:\Users\lenovo\OneDrive\Documents\APP\apps\web\public\videos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH, HEIGHT = 720, 290
FPS = 30
DURATION_SEC = 10
TOTAL_FRAMES = FPS * DURATION_SEC

try:
    font_large = ImageFont.truetype("arial.ttf", 22)
    font_med = ImageFont.truetype("arial.ttf", 14)
    font_small = ImageFont.truetype("arial.ttf", 11)
    font_mono = ImageFont.truetype("consola.ttf", 13)
except:
    font_large = ImageFont.load_default()
    font_med = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_mono = ImageFont.load_default()

def draw_hud(draw, title, subtitle, status_color, status_text, current_val_str, unit_str):
    draw.text((20, 15), title, fill=(241, 245, 249), font=font_med)
    draw.text((20, 34), subtitle, fill=(148, 163, 184), font=font_small)

    pill_x2 = WIDTH - 20
    pill_w = 120
    pill_x1 = pill_x2 - pill_w
    draw.rounded_rectangle([pill_x1, 14, pill_x2, 38], radius=6, fill=(15, 23, 42), outline=status_color, width=1)
    draw.ellipse([pill_x1 + 10, 23, pill_x1 + 16, 29], fill=status_color)
    draw.text((pill_x1 + 22, 19), status_text, fill=status_color, font=font_mono)

    val_x = pill_x1 - 150
    draw.text((val_x, 14), current_val_str, fill=(255, 255, 255), font=font_large)
    draw.text((val_x + 95, 20), unit_str, fill=(148, 163, 184), font=font_small)

def generate_live_reading_video():
    out_path = os.path.join(OUTPUT_DIR, "smoke_live_reading.mp4")
    print(f"Generating {out_path}...")
    writer = imageio.get_writer(out_path, fps=FPS, codec="libx264", quality=8)

    plot_x1, plot_y1 = 60, 65
    plot_x2, plot_y2 = WIDTH - 30, HEIGHT - 35
    plot_w = plot_x2 - plot_x1
    plot_h = plot_y2 - plot_y1

    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / TOTAL_FRAMES
        phase = t * 2.0 * math.pi

        img = Image.new("RGB", (WIDTH, HEIGHT), (11, 15, 25))
        draw = ImageDraw.Draw(img, "RGBA")

        grid_cols = 8
        grid_rows = 5
        for i in range(grid_cols + 1):
            gx = plot_x1 + (i * plot_w / grid_cols)
            draw.line([(gx, plot_y1), (gx, plot_y2)], fill=(30, 41, 59, 120), width=1)
            sec_val = f"-{(grid_cols - i)*2}s" if i < grid_cols else "Now"
            draw.text((gx - 10, plot_y2 + 6), sec_val, fill=(100, 116, 139), font=font_small)

        for j in range(grid_rows + 1):
            gy = plot_y1 + (j * plot_h / grid_rows)
            draw.line([(plot_x1, gy), (plot_x2, gy)], fill=(30, 41, 59, 120), width=1)
            ppm_val = f"{int(500 - (j * 500 / grid_rows))}"
            draw.text((plot_x1 - 35, gy - 6), ppm_val, fill=(100, 116, 139), font=font_small)

        warn_y = plot_y2 - (250 / 500.0) * plot_h
        crit_y = plot_y2 - (400 / 500.0) * plot_h
        draw.line([(plot_x1, warn_y), (plot_x2, warn_y)], fill=(245, 158, 11, 100), width=1)
        draw.text((plot_x2 - 80, warn_y - 12), "Warn 250 PPM", fill=(245, 158, 11, 160), font=font_small)
        draw.line([(plot_x1, crit_y), (plot_x2, crit_y)], fill=(239, 68, 68, 100), width=1)
        draw.text((plot_x2 - 75, crit_y - 12), "Crit 400 PPM", fill=(239, 68, 68, 160), font=font_small)

        num_points = 100
        points = []
        last_ppm = 150
        for i in range(num_points):
            frac = i / (num_points - 1)
            w1 = math.sin(phase * 1 + frac * 4.0 * math.pi) * 45
            w2 = math.sin(phase * 2 - frac * 6.0 * math.pi) * 25
            w3 = math.cos(phase * 3 + frac * 2.0 * math.pi) * 15
            anomaly_center = 0.65
            dist = abs(frac - anomaly_center)
            plume = max(0.0, 1.0 - (dist / 0.22)) ** 2 * 140 * (0.8 + 0.2 * math.sin(phase * 2))

            ppm = 135 + w1 + w2 + w3 + plume
            ppm = max(40, min(480, ppm))

            px = plot_x1 + frac * plot_w
            py = plot_y2 - (ppm / 500.0) * plot_h
            points.append((px, py))
            if i == num_points - 1:
                last_ppm = ppm

        poly_points = [(plot_x1, plot_y2)] + points + [(plot_x2, plot_y2)]
        draw.polygon(poly_points, fill=(16, 185, 129, 35))

        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i+1]
            draw.line([p1, p2], fill=(16, 185, 129, 90), width=4)
            draw.line([p1, p2], fill=(52, 211, 153, 255), width=2)

        head_x, head_y = points[-1]
        pulse_r = 6 + 3 * math.sin(phase * 8)
        draw.ellipse([head_x - pulse_r, head_y - pulse_r, head_x + pulse_r, head_y + pulse_r], fill=(16, 185, 129, 90))
        draw.ellipse([head_x - 3.5, head_y - 3.5, head_x + 3.5, head_y + 3.5], fill=(255, 255, 255, 255))

        if last_ppm >= 400:
            st_color = (239, 68, 68)
            st_text = "CRITICAL"
        elif last_ppm >= 250:
            st_color = (245, 158, 11)
            st_text = "WARNING"
        else:
            st_color = (16, 185, 129)
            st_text = "NORMAL"

        draw_hud(
            draw,
            "MQ135 OPTICAL & SEMICONDUCTOR SMOKE SENSOR",
            "Node NODE-001 • Telemetry 10-Sample Moving Median",
            st_color,
            st_text,
            f"{last_ppm:.1f}",
            "PPM Smoke"
        )

        writer.append_data(np.array(img))

    writer.close()
    print("Done generating smoke_live_reading.mp4")

def generate_alert_history_video():
    out_path = os.path.join(OUTPUT_DIR, "smoke_alert_history.mp4")
    print(f"Generating {out_path}...")
    writer = imageio.get_writer(out_path, fps=FPS, codec="libx264", quality=8)

    plot_x1, plot_y1 = 60, 65
    plot_x2, plot_y2 = WIDTH - 30, HEIGHT - 35
    plot_w = plot_x2 - plot_x1
    plot_h = plot_y2 - plot_y1

    history_events = [
        {"time": "14:00", "ppm": 120, "alert": False},
        {"time": "14:15", "ppm": 145, "alert": False},
        {"time": "14:30", "ppm": 290, "alert": True, "label": "Warn Threshold"},
        {"time": "14:45", "ppm": 180, "alert": False},
        {"time": "15:00", "ppm": 485, "alert": True, "label": "Severe Spike"},
        {"time": "15:15", "ppm": 520, "alert": True, "label": "SLA Triggered"},
        {"time": "15:30", "ppm": 310, "alert": True, "label": "Dissipating"},
        {"time": "15:45", "ppm": 160, "alert": False},
        {"time": "16:00", "ppm": 140, "alert": False},
        {"time": "16:15", "ppm": 130, "alert": False},
    ]

    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / TOTAL_FRAMES
        phase = t * 2.0 * math.pi

        img = Image.new("RGB", (WIDTH, HEIGHT), (11, 15, 25))
        draw = ImageDraw.Draw(img, "RGBA")

        for i in range(len(history_events)):
            gx = plot_x1 + (i * plot_w / (len(history_events) - 1))
            draw.line([(gx, plot_y1), (gx, plot_y2)], fill=(30, 41, 59, 120), width=1)
            draw.text((gx - 14, plot_y2 + 6), history_events[i]["time"], fill=(100, 116, 139), font=font_small)

        for j in range(6):
            gy = plot_y1 + (j * plot_h / 5)
            draw.line([(plot_x1, gy), (plot_x2, gy)], fill=(30, 41, 59, 120), width=1)
            draw.text((plot_x1 - 35, gy - 6), f"{int(600 - (j * 120))}", fill=(100, 116, 139), font=font_small)

        crit_y = plot_y2 - (400 / 600.0) * plot_h
        draw.line([(plot_x1, crit_y), (plot_x2, crit_y)], fill=(239, 68, 68, 120), width=1)
        draw.text((plot_x1 + 10, crit_y - 12), "CRITICAL ESCALATION THRESHOLD (400 PPM)", fill=(239, 68, 68, 180), font=font_small)

        bar_pts = []
        for i, ev in enumerate(history_events):
            bx = plot_x1 + (i * plot_w / (len(history_events) - 1))
            fluct = math.sin(phase + i) * 8 if ev["alert"] else math.sin(phase + i) * 3
            ppm_val = max(50, ev["ppm"] + fluct)
            by = plot_y2 - (ppm_val / 600.0) * plot_h
            bar_pts.append((bx, by, ppm_val, ev))

        poly = [(plot_x1, plot_y2)]
        for bx, by, _, _ in bar_pts:
            poly.append((bx, by))
        poly.append((plot_x2, plot_y2))
        draw.polygon(poly, fill=(244, 63, 94, 30))

        for i in range(len(bar_pts) - 1):
            p1 = (bar_pts[i][0], bar_pts[i][1])
            p2 = (bar_pts[i+1][0], bar_pts[i+1][1])
            draw.line([p1, p2], fill=(244, 63, 94, 180), width=3)

        for bx, by, ppm_val, ev in bar_pts:
            if ev["alert"]:
                flash_r = 7 + 2 * math.sin(phase * 4 + bx)
                draw.ellipse([bx - flash_r, by - flash_r, bx + flash_r, by + flash_r], fill=(239, 68, 68, 100))
                draw.ellipse([bx - 4, by - 4, bx + 4, by + 4], fill=(255, 255, 255))

                tag = ev.get("label", "ALERT")
                tag_y = by - 24
                draw.rounded_rectangle([bx - 32, tag_y - 2, bx + 32, tag_y + 12], radius=4, fill=(190, 18, 60), outline=(255, 255, 255, 120))
                draw.text((bx - 28, tag_y), tag, fill=(255, 255, 255), font=font_small)
            else:
                draw.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=(100, 116, 139))

        draw_hud(
            draw,
            "SMOKE INCIDENT & SLA ESCALATION HISTORY",
            "Auto-escalated to District Magistrate if >400 PPM persists 72 hours",
            (239, 68, 68),
            "4 ALERTS LOGGED",
            "520 MAX",
            "PPM Peak"
        )

        writer.append_data(np.array(img))

    writer.close()
    print("Done generating smoke_alert_history.mp4")

if __name__ == "__main__":
    generate_live_reading_video()
    generate_alert_history_video()
    print("All videos successfully created in", OUTPUT_DIR)
