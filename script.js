const dailyTasks = ["Emails", "Scheduling"];
    const rotatingTasks = [
        "Meeting Prep / Follow-ups", "Wrike Tasking Updates", "Content Creation", "Digital Strategy",
        "Team Meeting", "Creative Review", "Wrike Tasking", "Campaign Planning",
        "Asset Review", "Approvals & Feedback", "Brainstorming / Concepting",
        "Template Updates", "Mockup / Layout Drafting", "Style Guide Checks",
        "Analytics Check-ins", "Researching"
    ];

    const fixedMeetings = {
        "Monday": [["Core Meeting", 60, 100], ["Database Meeting", 35, 75]],
        "Tuesday": [["BEMA Meeting", 20, 40], ["Chase 1:1", 30, 60], ["Ely 1:1", 30, 60]],
        "Wednesday": [["Creative Meeting", 60, 120]],
    };

    // --- Global variable to store the last generated schedule for export ---
    let lastGeneratedSchedule = [];
    let lastWeeklyTotalMinutes = 0;

    // --- Helper Functions ---
    function randRange(min, max, maxConstraint = null) {
        let value;
        let actualMax = maxConstraint !== null ? Math.min(max, maxConstraint) : max;

        if (actualMax < min) actualMax = min;
        
        if (min === actualMax) { 
            value = min;
        } else {
            do {
                value = Math.floor(Math.random() * (actualMax - min + 1)) + min;
            } while (value % 5 === 0);
        }
        return value;
    }

    function formatTime(minutes) {
        if (typeof minutes !== 'number' || isNaN(minutes)) return "0:00";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}:${String(m).padStart(2, '0')}`;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Core Schedule Generation Logic ---
    function generateScheduleLogic() {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        let schedule = [];
        let weeklyTotalMinutes = 0;
        let dailyTotalsMap = new Map();

        const weekdayMinMinutes = 5 * 60; // 300 minutes
        const weekdayMaxMinutes = 6 * 60 + 30; // 390 minutes

        for (let day of days) {
            let dayEntries = [];
            let currentDayMinutes = 0;

            if (day === "Sunday") {
                let dur = randRange(120, 240);
                dayEntries.push({ day: day, task: "Live Stream Moderation", duration: dur });
                currentDayMinutes += dur;
            } else {
                // 1. Add Fixed Meetings
                if (fixedMeetings[day]) {
                    for (let [name, min, max] of fixedMeetings[day]) {
                        let dur = randRange(min, max);
                        dayEntries.push({ day: day, task: name, duration: dur });
                        currentDayMinutes += dur;
                    }
                }

                // 2. Add Daily Tasks (Emails, Scheduling)
                const numEmailChunks = randRange(2, 4);
                for (let i = 0; i < numEmailChunks; i++) {
                    let dur = randRange(10, 30, 90);
                    dayEntries.push({ day: day, task: "Emails", duration: dur });
                    currentDayMinutes += dur;
                }

                const numSchedulingChunks = randRange(2, 4);
                for (let i = 0; i < numSchedulingChunks; i++) {
                    let dur = randRange(10, 30, 90);
                    dayEntries.push({ day: day, task: "Scheduling", duration: dur });
                    currentDayMinutes += dur;
                }

                // 3. Add Initial Rotating Tasks
                let initialRotatingCount = randRange(5, 9);
                let availableRotatingTasks = [...rotatingTasks];
                shuffleArray(availableRotatingTasks);

                for (let i = 0; i < initialRotatingCount; i++) {
                    if (i >= availableRotatingTasks.length) break;
                    let task = availableRotatingTasks[i];
                    let dur = randRange(10, 50, 90);

                    if (currentDayMinutes + dur > weekdayMaxMinutes + 50 && i > 0) {
                        break;
                    }
                    dayEntries.push({ day: day, task: task, duration: dur });
                    currentDayMinutes += dur;
                }

                // 4. Adjust Day Total to be within 5h-6h30m (300-390 minutes)
                let attempts = 0;
                const maxAttempts = 100;

                while ((currentDayMinutes < weekdayMinMinutes || currentDayMinutes > weekdayMaxMinutes) && attempts < maxAttempts) {
                    let changed = false;

                    if (currentDayMinutes < weekdayMinMinutes) {
                        let needed = weekdayMinMinutes - currentDayMinutes;
                        let taskPool = [...dailyTasks, ...rotatingTasks];
                        let taskToAdd = taskPool[Math.floor(Math.random() * taskPool.length)];
                        
                        let potentialAddDur = randRange(10, Math.min(50, needed + 20), 90);
                        
                        if (potentialAddDur > 0) {
                            dayEntries.push({ day: day, task: taskToAdd, duration: potentialAddDur });
                            currentDayMinutes += potentialAddDur;
                            changed = true;
                        }
                    } else if (currentDayMinutes > weekdayMaxMinutes) {
                        let excess = currentDayMinutes - weekdayMaxMinutes;
                        let removableTasks = dayEntries.filter(e => 
                            (dailyTasks.includes(e.task) || rotatingTasks.includes(e.task)) && e.duration >= 10);
                        
                        if (removableTasks.length > 0) {
                            removableTasks.sort((a, b) => Math.abs(a.duration - excess) - Math.abs(b.duration - excess));
                            let taskToAdjust = removableTasks[0];
                            
                            let indexToAdjust = dayEntries.indexOf(taskToAdjust);
                            
                            let reduceAmount = Math.min(taskToAdjust.duration - 10, excess);
                            if (reduceAmount > 0) {
                                taskToAdjust.duration -= reduceAmount;
                                currentDayMinutes -= reduceAmount;
                                changed = true;
                            } else {
                                if (taskToAdjust.duration <= excess + 10) {
                                    dayEntries.splice(indexToAdjust, 1);
                                    currentDayMinutes -= taskToAdjust.duration;
                                    changed = true;
                                }
                            }
                        } else {
                            break; 
                        }
                    }
                    if (!changed && attempts > 0) break;
                    attempts++;
                }

                // Final small adjustment if slightly out after attempts
                if (currentDayMinutes < weekdayMinMinutes) {
                    let needed = weekdayMinMinutes - currentDayMinutes;
                    if (needed > 0) {
                        let task = rotatingTasks[Math.floor(Math.random() * rotatingTasks.length)];
                        let dur = needed; 
                        if (dur > 90) dur = 90; 
                        if (dur < 10 && needed > 0) dur = 10; 
                        if (dur > 0) {
                            dayEntries.push({ day: day, task: task, duration: dur });
                            currentDayMinutes += dur;
                        }
                    }
                } else if (currentDayMinutes > weekdayMaxMinutes) {
                    let excess = currentDayMinutes - weekdayMaxMinutes;
                    if (dayEntries.length > 0) {
                        let lastAdjustableEntry = dayEntries.findLast(e => dailyTasks.includes(e.task) || rotatingTasks.includes(e.task));
                        if (lastAdjustableEntry) {
                             if (lastAdjustableEntry.duration - excess >= 10) {
                                lastAdjustableEntry.duration -= excess;
                                currentDayMinutes -= excess;
                            } else {
                                let reduceAmount = lastAdjustableEntry.duration - 10;
                                if (reduceAmount > 0) {
                                    lastAdjustableEntry.duration -= reduceAmount;
                                    currentDayMinutes -= reduceAmount;
                                }
                            }
                        }
                    }
                }

                shuffleArray(dayEntries);
            }

            schedule.push(...dayEntries);
            weeklyTotalMinutes += currentDayMinutes;
            dailyTotalsMap.set(day, currentDayMinutes);
        }
        return { schedule, weeklyTotalMinutes, dailyTotalsMap };
    }

    // --- Function to run and display all constraint checks ---
    function checkAllConstraints(schedule, weeklyTotalMinutes, dailyTotalsMap) {
        let allPass = true;

        // 1. Weekly Total
        const weeklyMin = 32 * 60;
        const weeklyMax = 36 * 60;
        if (!(weeklyTotalMinutes >= weeklyMin && weeklyTotalMinutes <= weeklyMax)) {
            allPass = false;
        }

        // 2. Daily Weekday Totals
        const weekdayMin = 5 * 60;
        const weekdayMax = 6 * 60 + 30;
        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        for (let day of weekdays) {
            const total = dailyTotalsMap.get(day) || 0;
            if (!(total >= weekdayMin && total <= weekdayMax)) {
                allPass = false;
            }
        }

        // 3. Sunday Total & Content
        const sundayMin = 2 * 60;
        const sundayMax = 4 * 60;
        const sundayTotal = dailyTotalsMap.get("Sunday") || 0;
        const sundayEntries = schedule.filter(entry => entry.day === "Sunday");
        const sundayContentPass = sundayEntries.length > 0 && sundayEntries.every(e => e.task === "Live Stream Moderation");
        const sundayDurationPass = sundayTotal >= sundayMin && sundayTotal <= sundayMax;
        if (!(sundayContentPass && sundayDurationPass)) {
            allPass = false;
        }

        // 4. Max Task Duration (<= 90m for non-fixed)
        let maxTaskDurationPass = true;
        let tasksExceeding90 = [];
        const fixedMeetingNames = Object.values(fixedMeetings).flat().map(fm => fm[0]);
        fixedMeetingNames.push("Live Stream Moderation"); 

        for (let entry of schedule) {
            if (!fixedMeetingNames.includes(entry.task) && entry.duration > 90) {
                maxTaskDurationPass = false;
                tasksExceeding90.push(`${entry.day} - ${entry.task} (${formatTime(entry.duration)})`);
            }
        }
        if (!maxTaskDurationPass) {
            console.warn("Tasks exceeding 90m (excluding fixed meetings):", tasksExceeding90);
        }
        if (!maxTaskDurationPass) allPass = false;


        // 5. Daily Task (Emails/Scheduling) Frequency & Duration
        for (let day of weekdays) {
            const dayEntries = schedule.filter(entry => entry.day === day);
            
            const emails = dayEntries.filter(e => e.task === "Emails");
            const scheduling = dayEntries.filter(e => e.task === "Scheduling");

            const emailsCountOk = emails.length >= 2 && emails.length <= 4;
            const emailsDurationOk = emails.every(e => e.duration >= 10 && e.duration <= 30);
            
            const schedulingCountOk = scheduling.length >= 2 && scheduling.length <= 4;
            const schedulingDurationOk = scheduling.every(e => e.duration >= 10 && e.duration <= 30);

            if (!(emailsCountOk && emailsDurationOk && schedulingCountOk && schedulingDurationOk)) {
                allPass = false;
            }
        }

        // 6. Rotating Tasks per Weekday (5-9)
        for (let day of weekdays) {
            const dayEntries = schedule.filter(entry => entry.day === day);
            const nonFixedNonDailyTasks = dayEntries.filter(e => 
                !dailyTasks.includes(e.task) && 
                !fixedMeetingNames.includes(e.task)
            );
            const uniqueRotatingTasksCount = new Set(nonFixedNonDailyTasks.map(e => e.task)).size;
            
            if (!(uniqueRotatingTasksCount >= 5 && uniqueRotatingTasksCount <= 9)) {
                allPass = false;
            }
        }

        return allPass;
    }

    // --- Function to render the schedule table in the HTML ---
    function renderSchedule(schedule, weeklyTotalMinutes) {
        const tableHtml = [`<table>
            <tr><th>Day</th><th>Task</th><th>Duration</th></tr>`];

        for (let entry of schedule) {
            tableHtml.push(`<tr><td>${entry.day}</td><td>${entry.task}</td><td>${formatTime(entry.duration)}</td></tr>`);
        }

        tableHtml.push(`<tr><th colspan="2">Weekly Total</th><th>${formatTime(weeklyTotalMinutes)}</th></tr></table>`);
        document.getElementById("schedule").innerHTML = tableHtml.join("\n");
    }

    // --- Function to update UI with constraint checks results ---
    function runConstraintChecks(schedule, weeklyTotalMinutes, dailyTotalsMap) {
        // Elements for display
        const weeklyCheckSpan = document.getElementById("check-weekly-total");
        const dailyChecksList = document.getElementById("check-daily-totals");
        const sundayCheckSpan = document.getElementById("check-sunday-total");
        const maxTaskDurationCheckSpan = document.getElementById("check-max-task-duration");
        const dailyTasksFrequencyList = document.getElementById("check-daily-tasks-frequency");
        const rotatingTasksCountList = document.getElementById("check-rotating-tasks-count");

        // Clear previous results
        dailyChecksList.innerHTML = '';
        dailyTasksFrequencyList.innerHTML = '';
        rotatingTasksCountList.innerHTML = '';

        // Recalculate values for display in the UI (these are already checked by checkAllConstraints)

        // 1. Weekly Total
        const weeklyMin = 32 * 60;
        const weeklyMax = 36 * 60;
        const weeklyPass = weeklyTotalMinutes >= weeklyMin && weeklyTotalMinutes <= weeklyMax;
        weeklyCheckSpan.textContent = weeklyPass ? "PASS" : "FAIL";
        weeklyCheckSpan.className = weeklyPass ? "pass" : "fail";

        // 2. Daily Weekday Totals
        const weekdayMin = 5 * 60;
        const weekdayMax = 6 * 60 + 30;
        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        for (let day of weekdays) {
            const total = dailyTotalsMap.get(day) || 0;
            const pass = total >= weekdayMin && total <= weekdayMax;
            const li = document.createElement('li');
            li.innerHTML = `${day} (${formatTime(total)}): <span class="${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'}</span>`;
            dailyChecksList.appendChild(li);
        }

        // 3. Sunday Total & Content
        const sundayMin = 2 * 60;
        const sundayMax = 4 * 60;
        const sundayTotal = dailyTotalsMap.get("Sunday") || 0;
        const sundayEntries = schedule.filter(entry => entry.day === "Sunday");
        const sundayContentPass = sundayEntries.length > 0 && sundayEntries.every(e => e.task === "Live Stream Moderation");
        const sundayDurationPass = sundayTotal >= sundayMin && sundayTotal <= sundayMax;
        const sundayPass = sundayContentPass && sundayDurationPass;
        sundayCheckSpan.textContent = sundayPass ? "PASS" : "FAIL";
        sundayCheckSpan.className = sundayPass ? "pass" : "fail";

        // 4. Max Task Duration (<= 90m for non-fixed)
        let maxTaskDurationPass = true;
        let tasksExceeding90 = [];
        const fixedMeetingNames = Object.values(fixedMeetings).flat().map(fm => fm[0]);
        fixedMeetingNames.push("Live Stream Moderation"); 

        for (let entry of schedule) {
            if (!fixedMeetingNames.includes(entry.task) && entry.duration > 90) {
                maxTaskDurationPass = false;
                tasksExceeding90.push(`${entry.day} - ${entry.task} (${formatTime(entry.duration)})`);
            }
        }
        maxTaskDurationCheckSpan.textContent = maxTaskDurationPass ? "PASS" : "FAIL";
        maxTaskDurationCheckSpan.className = maxTaskDurationPass ? "pass" : "fail";
        if (!maxTaskDurationPass) {
            maxTaskDurationCheckSpan.title = "Tasks exceeding 90m (excluding fixed meetings):\n" + tasksExceeding90.join("\n");
        }


        // 5. Daily Task (Emails/Scheduling) Frequency & Duration
        for (let day of weekdays) {
            const dayEntries = schedule.filter(entry => entry.day === day);
            
            const emails = dayEntries.filter(e => e.task === "Emails");
            const scheduling = dayEntries.filter(e => e.task === "Scheduling");

            const emailsCountOk = emails.length >= 2 && emails.length <= 4;
            const emailsDurationOk = emails.every(e => e.duration >= 10 && e.duration <= 30);
            
            const schedulingCountOk = scheduling.length >= 2 && scheduling.length <= 4;
            const schedulingDurationOk = scheduling.every(e => e.duration >= 10 && e.duration <= 30);

            const dailyDayPass = emailsCountOk && emailsDurationOk && schedulingCountOk && schedulingDurationOk;

            const li = document.createElement('li');
            li.innerHTML = `${day}: Emails Count (${emails.length}): <span class="${emailsCountOk ? 'pass' : 'fail'}">${emailsCountOk ? 'PASS' : 'FAIL'}</span>, Duration: <span class="${emailsDurationOk ? 'pass' : 'fail'}">${emailsDurationOk ? 'PASS' : 'FAIL'}</span><br>
                           Scheduling Count (${scheduling.length}): <span class="${schedulingCountOk ? 'pass' : 'fail'}">${schedulingCountOk ? 'PASS' : 'FAIL'}</span>, Duration: <span class="${schedulingDurationOk ? 'pass' : 'fail'}">${schedulingDurationOk ? 'PASS' : 'FAIL'}</span>`;
            dailyTasksFrequencyList.appendChild(li);
        }

        // 6. Rotating Tasks per Weekday (5-9)
        for (let day of weekdays) {
            const dayEntries = schedule.filter(entry => entry.day === day);
            const nonFixedNonDailyTasks = dayEntries.filter(e => 
                !dailyTasks.includes(e.task) && 
                !fixedMeetingNames.includes(e.task)
            );
            const uniqueRotatingTasksCount = new Set(nonFixedNonDailyTasks.map(e => e.task)).size;
            
            const pass = uniqueRotatingTasksCount >= 5 && uniqueRotatingTasksCount <= 9;

            const li = document.createElement('li');
            li.innerHTML = `${day} (Unique Rotating: ${uniqueRotatingTasksCount}): <span class="${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'}</span>`;
            rotatingTasksCountList.appendChild(li);
        }
    }

    // --- Function to export the current schedule to CSV ---
    function exportScheduleToCSV() {
        if (lastGeneratedSchedule.length === 0) {
            alert("No schedule generated yet to export!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Day,Task,Duration\n"; // CSV Header

        lastGeneratedSchedule.forEach(entry => {
            const durationFormatted = formatTime(entry.duration);
            // Basic CSV escaping for task name
            const taskName = entry.task.includes(',') || entry.task.includes('"') ? `"${entry.task.replace(/"/g, '""')}"` : entry.task;
            csvContent += `${entry.day},${taskName},${durationFormatted}\n`;
        });

        // Add the weekly total at the end for context
        csvContent += `\nWeekly Total,,${formatTime(lastWeeklyTotalMinutes)}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        
        // Use current date for filename
        const now = new Date();
        const fileName = `Work_Schedule_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.csv`;

        link.setAttribute("download", fileName);
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link); // Clean up
    }

    // --- Main function to handle generation loop and display ---
    function generateAndDisplaySchedule() {
        let schedule = [];
        let weeklyTotalMinutes = 0;
        let dailyTotalsMap = new Map();
        let allConstraintsMet = false;
        let attempts = 0;
        const MAX_GENERATION_ATTEMPTS = 2000; // Cap attempts to prevent infinite loops (you can adjust this)

        const statusDiv = document.getElementById("generation-status");
        statusDiv.textContent = 'Generating schedule...';
        statusDiv.className = 'warning';
        document.getElementById("schedule").innerHTML = ''; // Clear previous schedule
        document.getElementById("constraintChecks").style.display = 'none'; // Hide checks during generation

        while (!allConstraintsMet && attempts < MAX_GENERATION_ATTEMPTS) {
            ({ schedule, weeklyTotalMinutes, dailyTotalsMap } = generateScheduleLogic());
            allConstraintsMet = checkAllConstraints(schedule, weeklyTotalMinutes, dailyTotalsMap);
            attempts++;
        }

        // Store the successfully generated (or best attempt) schedule globally for export
        lastGeneratedSchedule = schedule;
        lastWeeklyTotalMinutes = weeklyTotalMinutes;

        renderSchedule(schedule, weeklyTotalMinutes);
        runConstraintChecks(schedule, weeklyTotalMinutes, dailyTotalsMap);
        document.getElementById("constraintChecks").style.display = 'block'; 

        if (allConstraintsMet) {
            statusDiv.textContent = `Successfully generated compliant schedule in ${attempts} attempts!`;
            statusDiv.className = 'success';
            console.log(`Successfully generated compliant schedule in ${attempts} attempts!`);
        } else {
            statusDiv.textContent = `Could not generate a fully compliant schedule after ${MAX_GENERATION_ATTEMPTS} attempts. Displaying best attempt.`;
            statusDiv.className = 'warning';
            console.warn(`Could not generate a fully compliant schedule after ${MAX_GENERATION_ATTEMPTS} attempts. Displaying best attempt.`);
        }
    }