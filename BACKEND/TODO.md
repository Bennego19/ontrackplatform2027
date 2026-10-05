# Fix Add Students (Student Assignment) Issues

## Issues Identified
- [ ] Track selection inconsistency: Tracks use `value={track._id}` but should use `value={track.name}` to match programs
- [ ] Typo in tracks array: "Robotis" should be "Robotics"

## Fixes Needed
- [ ] Update track select to use `track.name` instead of `track._id`
- [ ] Fix "Robotis" typo to "Robotics"
- [ ] Test the assignment functionality

## Files to Edit
- ontrackapp/src/components/studentassignment.js
