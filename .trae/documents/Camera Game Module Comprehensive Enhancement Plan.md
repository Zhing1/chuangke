# Camera Game Module Comprehensive Enhancement Plan

Based on your requirements, I have designed a plan to fix the `div` stability issues, implement precise detection for 21 actions, and optimize the game content.

## 1. UI/UX Stabilization & Content Optimization
**Goal**: Ensure the camera status indicator is stable, visible, and non-obtrusive, while removing "useless content".

*   **Status Indicator Fix**: 
    *   The issue arises because `cameraStatusIndicator` shares styles with the control panel status. I will separate them.
    *   **New Design**: The video overlay status (`#cameraStatusIndicator`) will be a persistent, minimal **HUD (Heads-Up Display)** in the top-right corner.
    *   **States**:
        *   *Disconnected*: Red badge "Not Connected".
        *   *Loading*: Yellow badge "Starting...".
        *   *Active*: Green pulsing dot + "Active" (Text minimized).
*   **Content Cleanup**:
    *   Remove redundant text from the video container.
    *   Ensure the `calibrationOverlay` only appears during the calibration phase and disappears completely afterwards.
    *   Fix the "Action Guide" (`#actionGuide`) to ensure it doesn't block the user's view of themselves.

## 2. 21-Action Precise Detection Engine
**Goal**: Expand the action library to 21 specific fitness moves with precise angle-based detection.

I will implement a `PoseAnalyzer` system with specific geometric criteria for:

### Action Library Classification
1.  **Cardio (Aerobic)**:
    *   **Jumping Jack** (开合跳)
    *   **High Knees** (高抬腿)
    *   **Burpee** (波比跳) - *Complex state machine*
    *   **Mountain Climber** (登山跑)
    *   **Shadow Boxing** (拳击) - *New*
2.  **Legs & Glutes**:
    *   **Squat** (深蹲) - *Already exists, will refine*
    *   **Lunge** (弓步蹲)
    *   **Side Lunge** (侧弓步)
    *   **Calf Raise** (提踵)
    *   **Glute Bridge** (臀桥) - *Floor detection*
    *   **Sumo Squat** (相扑深蹲)
3.  **Upper Body**:
    *   **Push-up** (俯卧撑) - *Floor detection*
    *   **Plank** (平板支撑) - *Static hold timer*
    *   **Tricep Dip** (臂屈伸) - *Floor/Chair*
    *   **Arm Circles** (手臂画圈)
    *   **Lateral Raise** (侧平举)
    *   **Shoulder Press** (推举)
4.  **Core (Abs)**:
    *   **Sit-up** (仰卧起坐)
    *   **Crunch** (卷腹)
    *   **Leg Raise** (抬腿)
    *   **Russian Twist** (俄罗斯转体)
    *   **Bicycle Crunch** (空中蹬车)

### Technical Implementation
*   **Angle Calculation**: Use 3-point vectors (e.g., Hip-Knee-Ankle for squats) to determine "Down" and "Up" states.
*   **State Machine**: `Neutral` -> `Eccentric` (Down) -> `Hold` (Optional) -> `Concentric` (Up) -> `Rep Count`.
*   **Confidence Threshold**: Only count reps when pose visibility > 0.6.

## 3. Performance & Testing
*   **Performance**:
    *   Optimize `canvas` drawing to reduce lag.
    *   Throttle UI updates (score/timer) to 10fps while keeping physics at 30fps.
*   **Testing**:
    *   **Compatibility**: Ensure `MediaPipe` works on mobile (adjusting model complexity).
    *   **Validation**: Add a "Debug Mode" toggle to visualize the skeleton angles for verifying detection logic.

## 4. Execution Steps
1.  **Refactor `FitRhythmCameraGameFinal`**: Create modular action detection methods.
2.  **Update UI**: Modify `index.html` and `style.css` for the new HUD and Wizard options.
3.  **Implement Logic**: Write the 21 detection algorithms in `camera-game-final.js`.
4.  **Verify**: Test the flow from "Wizard" -> "Calibration" -> "Game" -> "Leaderboard".